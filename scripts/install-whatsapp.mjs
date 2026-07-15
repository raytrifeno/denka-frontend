// Pasang dependensi layanan WhatsApp (frontend/whatsapp) sebelum build Tauri,
// supaya folder itu ikut ter-bundle lengkap dengan node_modules (bundle.resources).
// Pakai npm (bukan pnpm) agar berisi berkas nyata, bukan symlink yang tidak
// ikut ter-bundle. Chromium tidak diunduh — layanan memakai browser yang ada di PC.
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "whatsapp");
if (!existsSync(path.join(dir, "package.json"))) {
  console.log("[install-whatsapp] whatsapp/package.json tidak ada — dilewati.");
  process.exit(0);
}

console.log("[install-whatsapp] memasang dependensi layanan WhatsApp…");
execSync("npm install --omit=dev --no-audit --no-fund", {
  cwd: dir,
  stdio: "inherit",
  env: { ...process.env, PUPPETEER_SKIP_DOWNLOAD: "1" },
});
console.log("[install-whatsapp] selesai.");
