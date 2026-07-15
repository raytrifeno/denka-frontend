// Standalone WhatsApp sender for receipts (whatsapp-web.js).
// Runs as its own long-lived Node process — it cannot run on Vercel serverless
// because it drives a persistent Puppeteer/Chromium WhatsApp Web session.
// The desktop app spawns this automatically (Pengaturan → WhatsApp → Hubungkan);
// no terminal needed. Manual start for debugging: `node server.mjs`.

import http from "node:http";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pkg from "whatsapp-web.js";
import QRCode from "qrcode";
import { buildReceiptPdf } from "./receipt-pdf.mjs";

const { Client, LocalAuth, MessageMedia } = pkg;
const PORT = Number(process.env.WHATSAPP_PORT) || 3100;
const HERE = path.dirname(fileURLToPath(import.meta.url));

// Session lives in a fixed, writable directory so the app can spawn this from
// any working directory (and from a read-only install dir on Windows/macOS).
const SESSION_DIR = process.env.WHATSAPP_DATA_DIR || path.join(HERE, ".session");
fs.mkdirSync(SESSION_DIR, { recursive: true });

// Reuse a browser already installed on the PC so users never have to download
// Chromium themselves. Falls back to Puppeteer's bundled build.
function findBrowser() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  const candidates = {
    win32: [
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
      "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    ],
    darwin: [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    ],
    linux: [
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/usr/bin/microsoft-edge",
      "/usr/bin/brave",
    ],
  }[process.platform] ?? [];
  return candidates.find((p) => fs.existsSync(p));
}

// Pin versi WhatsApp Web ke HTML yang di-maintain (wppconnect/wa-version).
// Ini memperbaiki "QR ke-scan tapi gagal link" akibat WhatsApp Web berubah.
// Bump lewat env WA_WEB_VERSION jika suatu saat perlu versi lebih baru.
const WA_WEB_VERSION = process.env.WA_WEB_VERSION || "2.3000.1043020865-alpha";

// state: loading | qr | authenticated | ready | auth_failure | disconnected
let state = "loading";
let qrDataUrl = null;
let client = null;
let busy = false; // sedang membuat/mengganti instance client

function newClient() {
  return new Client({
    authStrategy: new LocalAuth({ dataPath: SESSION_DIR }),
    webVersion: WA_WEB_VERSION,
    webVersionCache: {
      type: "remote",
      remotePath: "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/{version}.html",
    },
    puppeteer: {
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      executablePath: findBrowser(),
    },
  });
}

function attachHandlers(c) {
  c.on("qr", async (qr) => {
    state = "qr";
    try {
      qrDataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 320 });
    } catch {
      qrDataUrl = null;
    }
  });
  c.on("authenticated", () => { state = "authenticated"; qrDataUrl = null; });
  c.on("ready", () => { state = "ready"; qrDataUrl = null; console.log("WhatsApp siap mengirim struk."); });
  c.on("auth_failure", () => { state = "auth_failure"; qrDataUrl = null; });
  c.on("disconnected", () => {
    qrDataUrl = null;
    if (busy) return; // reset sedang ditangani (mis. logout) — jangan tumpuk
    state = "disconnected";
    setTimeout(() => resetClient(), 800);
  });
}

// Membangun ulang instance Client dari nol. Ini satu-satunya cara andal untuk
// mendapatkan QR baru setelah logout / sesi putus — memanggil initialize() ulang
// pada instance lama sering menggantung di "loading" tanpa memunculkan QR.
async function resetClient({ logout = false } = {}) {
  if (busy) return;
  busy = true;
  state = "loading";
  qrDataUrl = null;
  if (client) {
    if (logout) { try { await client.logout(); } catch { /* mungkin belum login */ } }
    try { await client.destroy(); } catch { /* abaikan */ }
  }
  client = newClient();
  attachHandlers(client);
  try {
    await client.initialize();
  } catch (err) {
    console.error("Gagal memulai WhatsApp (cek Chromium/Puppeteer):", err?.message || err);
  } finally {
    busy = false;
  }
}

resetClient();

// 08xx / +62xx / 62xx → 62xx@c.us
function toChatId(phone) {
  let n = String(phone).replace(/\D/g, "");
  if (n.startsWith("0")) n = "62" + n.slice(1);
  return n + "@c.us";
}

async function readJson(req) {
  let body = "";
  for await (const chunk of req) body += chunk;
  return body ? JSON.parse(body) : {};
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  const json = (code, data) => {
    res.writeHead(code, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  };

  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
  if (req.method === "GET" && req.url === "/health") { json(200, { ready: state === "ready" }); return; }
  if (req.method === "GET" && req.url === "/status") {
    json(200, { state, ready: state === "ready", qr: qrDataUrl });
    return;
  }

  if (req.method === "POST" && req.url === "/logout") {
    // Jangan tunggu selesai (destroy+init bisa lama) — segera balas, UI akan
    // polling /status hingga QR baru muncul. resetClient membuat instance segar.
    state = "loading";
    qrDataUrl = null;
    resetClient({ logout: true });
    return json(200, { ok: true });
  }

  if (req.method === "POST" && req.url === "/send") {
    try {
      const { phone, message } = await readJson(req);
      if (!phone || !message) return json(400, { ok: false, error: "Nomor dan pesan wajib diisi." });
      if (state !== "ready") return json(503, { ok: false, error: "WhatsApp belum terhubung — hubungkan dulu di Pengaturan." });
      await client.sendMessage(toChatId(phone), message);
      return json(200, { ok: true });
    } catch (err) {
      return json(500, { ok: false, error: String(err?.message || err) });
    }
  }

  if (req.method === "POST" && req.url === "/send-receipt") {
    try {
      const { phone, receipt, caption } = await readJson(req);
      if (!phone || !receipt) return json(400, { ok: false, error: "Nomor dan data struk wajib diisi." });
      if (state !== "ready") return json(503, { ok: false, error: "WhatsApp belum terhubung — hubungkan dulu di Pengaturan." });
      const pdf = await buildReceiptPdf(receipt);
      const media = new MessageMedia("application/pdf", pdf.toString("base64"), `Struk-${receipt.number || "transaksi"}.pdf`);
      const teks = caption || `Struk ${receipt.number || ""} - ${receipt.store?.name || "Denka"}`.trim();
      await client.sendMessage(toChatId(phone), media, { caption: teks });
      return json(200, { ok: true });
    } catch (err) {
      return json(500, { ok: false, error: String(err?.message || err) });
    }
  }

  res.writeHead(404); res.end();
});

function lanIPs() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === "IPv4" && !i.internal)
    .map((i) => i.address);
}

server.listen(PORT, () => {
  console.log(`Layanan WhatsApp jalan di http://localhost:${PORT}`);
  for (const ip of lanIPs()) {
    console.log(`  Dari HP (isi di app → Pengaturan → URL Layanan): http://${ip}:${PORT}`);
  }
});
