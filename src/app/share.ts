// Aksi keluar aplikasi: kirim struk via WhatsApp (layanan whatsapp-web.js) & cetak.

import { PengaturanController } from "../domain/controllers/PengaturanController";

/**
 * Base URL layanan WhatsApp. Prioritas: setelan aplikasi (bisa diisi IP LAN PC
 * saat dipakai di HP) → env build → localhost. Dihitung per-panggilan agar
 * perubahan setelan langsung berlaku tanpa reload.
 */
function whatsappBase(): string {
  const custom = PengaturanController.getInstance().whatsapp.serverUrl?.trim();
  return (custom || import.meta.env.VITE_WHATSAPP_URL || "http://localhost:3100").replace(/\/$/, "");
}

export type WhatsAppState =
  | "loading"
  | "qr"
  | "authenticated"
  | "ready"
  | "auth_failure"
  | "disconnected"
  | "offline"; // layanan tidak terjangkau

/** Status koneksi layanan WhatsApp + QR (data URL) saat perlu login. */
export async function getWhatsAppStatus(): Promise<{ state: WhatsAppState; qr: string | null }> {
  try {
    const res = await fetch(`${whatsappBase()}/status`);
    const data = await res.json();
    return { state: (data.state as WhatsAppState) ?? "loading", qr: data.qr ?? null };
  } catch {
    return { state: "offline", qr: null };
  }
}

/** Putuskan sesi WhatsApp (logout) supaya bisa login akun lain. */
export async function logoutWhatsApp(): Promise<void> {
  await fetch(`${whatsappBase()}/logout`, { method: "POST" }).catch(() => {});
}

// Data struk terstruktur — layanan yang merender jadi PDF.
export type ReceiptData = {
  store: { nama: string; alamat: string; telepon: string; tampilkanAlamat: boolean };
  nomor: string;
  kasir: string;
  tanggal: string;
  items: { nama: string; jumlah: number; harga: number; subtotal: number }[];
  subtotal: number;
  diskon: number;
  total: number;
  metode: string;
  tunai: boolean;
  uangDiterima: number;
  kembalian: number;
  footer: string;
};

/** Kirim struk sebagai berkas PDF (dokumen WhatsApp), bukan pesan teks. */
export async function sendReceiptPdfWhatsApp(phone: string, receipt: ReceiptData): Promise<void> {
  const res = await fetch(`${whatsappBase()}/send-receipt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, receipt }),
  }).catch(() => {
    throw new Error("Layanan WhatsApp tidak terjangkau. Jalankan layanan WhatsApp dulu.");
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "Gagal mengirim struk WhatsApp.");
  }
}

/**
 * Kirim struk ke nomor pelanggan lewat layanan WhatsApp lokal (whatsapp-web.js).
 * Layanan dijalankan dari repo backend: `pnpm whatsapp`.
 */
export async function sendReceiptWhatsApp(phone: string, message: string): Promise<void> {
  const res = await fetch(`${whatsappBase()}/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, message }),
  }).catch(() => {
    throw new Error("Layanan WhatsApp tidak terjangkau. Jalankan `pnpm whatsapp` di backend.");
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "Gagal mengirim struk WhatsApp.");
  }
}

const RECEIPT_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font: 12px/1.5 "Courier New", monospace; color: #000; padding: 12px; width: 300px; }
  h1 { font-size: 15px; text-align: center; }
  .muted { color: #444; }
  .center { text-align: center; }
  .row { display: flex; justify-content: space-between; gap: 8px; }
  .row span:last-child { text-align: right; white-space: nowrap; }
  hr { border: none; border-top: 1px dashed #000; margin: 8px 0; }
  .total { font-weight: bold; font-size: 14px; }
  @media print { body { width: auto; } }
`;

/** Cetak potongan HTML lewat iframe tersembunyi (tanpa mengganggu DOM aplikasi). */
export function printHTML(inner: string): void {
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(frame);
  const doc = frame.contentWindow?.document;
  if (!doc) { frame.remove(); return; }
  doc.open();
  doc.write(`<!doctype html><meta charset="utf-8"><style>${RECEIPT_CSS}</style>${inner}`);
  doc.close();
  const win = frame.contentWindow!;
  win.onafterprint = () => frame.remove();
  win.focus();
  win.print();
  setTimeout(() => document.body.contains(frame) && frame.remove(), 60000);
}
