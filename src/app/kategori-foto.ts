import type { KategoriBarang } from "../domain/entities/Barang";
import laptop from "../assets/kategori/laptop.webp";
import pc from "../assets/kategori/pc.webp";
import aksesoris from "../assets/kategori/aksesoris.webp";
import sparepart from "../assets/kategori/sparepart.webp";
import lainnya from "../assets/kategori/lainnya.webp";

// Foto per kategori (Unsplash, di-resize kecil ~webp). Dipakai sebagai gambar
// produk agar ringan & tetap jalan offline — bukan per-barang.
export const KATEGORI_FOTO: Record<KategoriBarang, string> = {
  laptop,
  pc,
  aksesoris,
  sparepart,
  lainnya,
};
