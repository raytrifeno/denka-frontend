// Baca berkas gambar dari input file, perkecil di kanvas, kembalikan data URL
// ringkas. Offline-first: gambar disimpan sebagai data URL di snapshot lokal,
// jadi ukurannya sengaja ditekan agar penyimpanan tidak membengkak.

type Options = { maxDim?: number; quality?: number; keepAlpha?: boolean };

const MAX_INPUT_BYTES = 8 * 1024 * 1024; // tolak berkas mentah > 8MB

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Berkas gambar tidak dapat dibaca."));
    img.src = src;
  });
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Gagal membaca berkas."));
    reader.readAsDataURL(file);
  });
}

/** Ubah File gambar menjadi data URL terkompresi. Melempar Error bila tidak valid. */
export async function fileToDataUrl(file: File, opts: Options = {}): Promise<string> {
  const { maxDim = 640, quality = 0.82, keepAlpha = false } = opts;
  if (!file.type.startsWith("image/")) throw new Error("Berkas harus berupa gambar (PNG/JPG).");
  if (file.size > MAX_INPUT_BYTES) throw new Error("Ukuran gambar terlalu besar (maksimal 8MB).");

  const source = await readAsDataUrl(file);
  const img = await loadImage(source);
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return source;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  // PNG bila perlu transparansi (mis. logo), selain itu JPEG lebih ringkas.
  return keepAlpha ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", quality);
}

/** Buka dialog pilih berkas dan kembalikan gambar terkompresi (null bila dibatalkan). */
export function pickImage(opts: Options = {}): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      try {
        resolve(await fileToDataUrl(file, opts));
      } catch (err) {
        reject(err);
      }
    };
    input.click();
  });
}
