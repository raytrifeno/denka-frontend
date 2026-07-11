import type { Workbook } from "exceljs";
import { isTauri } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { Database } from "../Database";
import { LABEL_METODE } from "../entities/TransaksiPenjualan";
import { BarangMasuk, type MutasiStok } from "../entities/MutasiStok";

/** exceljs cukup besar, jadi dimuat hanya saat fitur ekspor dipakai. */
type ExcelNS = typeof import("exceljs");

export interface HasilEkspor {
  sukses: boolean;
  pesan: string;
}

const STATUS_STOK: Record<string, string> = {
  aman: "Aman",
  menipis: "Menipis",
  habis: "Habis",
};

function tanggal(nilai: Date): string {
  return nilai.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function ketMutasi(m: MutasiStok): string {
  if (m instanceof BarangMasuk) return `Masuk dari ${m.supplier}`;
  return "Keluar";
}

/** Rakit workbook multi-sheet dari data lokal (bekerja penuh saat offline). */
function rakitWorkbook(ExcelJS: ExcelNS): Workbook {
  const db = Database.getInstance();
  const wb = new ExcelJS.Workbook();
  wb.created = new Date();

  const penjualan = wb.addWorksheet("Penjualan");
  penjualan.columns = [
    { header: "Nomor", key: "nomor", width: 16 },
    { header: "Tanggal", key: "tanggal", width: 16 },
    { header: "Kasir", key: "kasir", width: 20 },
    { header: "Metode", key: "metode", width: 16 },
    { header: "Jumlah Item", key: "item", width: 12 },
    { header: "Subtotal", key: "subtotal", width: 16, style: { numFmt: "#,##0" } },
    { header: "Diskon", key: "diskon", width: 14, style: { numFmt: "#,##0" } },
    { header: "Total", key: "total", width: 16, style: { numFmt: "#,##0" } },
  ];
  for (const t of db.transaksi.findAll()) {
    penjualan.addRow({
      nomor: t.nomor,
      tanggal: tanggal(t.tanggal),
      kasir: t.kasir,
      metode: LABEL_METODE[t.metode],
      item: t.jumlahItem(),
      subtotal: t.subtotal(),
      diskon: t.diskon(),
      total: t.total(),
    });
  }

  const item = wb.addWorksheet("Item Penjualan");
  item.columns = [
    { header: "No. Transaksi", key: "nomor", width: 16 },
    { header: "Barang", key: "barang", width: 30 },
    { header: "Harga", key: "harga", width: 14, style: { numFmt: "#,##0" } },
    { header: "Jumlah", key: "jumlah", width: 10 },
    { header: "Subtotal", key: "subtotal", width: 16, style: { numFmt: "#,##0" } },
  ];
  for (const t of db.transaksi.findAll()) {
    for (const d of t.items) {
      item.addRow({
        nomor: t.nomor,
        barang: d.namaBarang,
        harga: d.hargaSatuan,
        jumlah: d.jumlah,
        subtotal: d.subtotal(),
      });
    }
  }

  const barang = wb.addWorksheet("Barang");
  barang.columns = [
    { header: "Kode", key: "kode", width: 14 },
    { header: "Nama", key: "nama", width: 30 },
    { header: "Kategori", key: "kategori", width: 16 },
    { header: "Harga Beli", key: "beli", width: 16, style: { numFmt: "#,##0" } },
    { header: "Harga Jual", key: "jual", width: 16, style: { numFmt: "#,##0" } },
    { header: "Stok", key: "stok", width: 10 },
    { header: "Stok Minimum", key: "min", width: 14 },
    { header: "Status", key: "status", width: 12 },
  ];
  for (const b of db.barang.findAll()) {
    barang.addRow({
      kode: b.kode,
      nama: b.nama,
      kategori: b.kategori,
      beli: b.hargaBeli,
      jual: b.hargaJual,
      stok: b.stok,
      min: b.stokMinimum,
      status: STATUS_STOK[b.statusStok()] ?? b.statusStok(),
    });
  }

  const service = wb.addWorksheet("Service");
  service.columns = [
    { header: "Nomor", key: "nomor", width: 14 },
    { header: "Tanggal Masuk", key: "tanggal", width: 16 },
    { header: "Pelanggan", key: "pelanggan", width: 24 },
    { header: "Telepon", key: "telepon", width: 16 },
    { header: "Unit", key: "unit", width: 16 },
    { header: "Merk", key: "merk", width: 18 },
    { header: "Status", key: "status", width: 14 },
    { header: "Teknisi", key: "teknisi", width: 18 },
    { header: "Total Biaya", key: "biaya", width: 16, style: { numFmt: "#,##0" } },
  ];
  for (const s of db.service.findAll()) {
    service.addRow({
      nomor: s.nomor,
      tanggal: tanggal(s.tanggalMasuk),
      pelanggan: s.pelanggan,
      telepon: s.telepon,
      unit: s.jenisUnit,
      merk: s.merk,
      status: s.status,
      teknisi: s.teknisi,
      biaya: s.totalBiaya(),
    });
  }

  const mutasi = wb.addWorksheet("Mutasi Stok");
  mutasi.columns = [
    { header: "Jenis", key: "jenis", width: 10 },
    { header: "Tanggal", key: "tanggal", width: 16 },
    { header: "Barang", key: "barang", width: 30 },
    { header: "Jumlah", key: "jumlah", width: 10 },
    { header: "Keterangan", key: "ket", width: 26 },
    { header: "Catatan", key: "catatan", width: 30 },
    { header: "Dicatat Oleh", key: "oleh", width: 18 },
  ];
  for (const m of db.mutasiStok.findAll()) {
    mutasi.addRow({
      jenis: m.jenis === "masuk" ? "Masuk" : "Keluar",
      tanggal: tanggal(m.tanggal),
      barang: m.namaBarang,
      jumlah: m.jumlah,
      ket: ketMutasi(m),
      catatan: m.catatan ?? "",
      oleh: m.dicatatOleh,
    });
  }

  for (const ws of wb.worksheets) ws.getRow(1).font = { bold: true };
  return wb;
}

/** Ekspor seluruh data ke berkas .xlsx (dialog simpan di desktop, unduh di browser). */
export async function exportToExcel(): Promise<HasilEkspor> {
  try {
    const mod = (await import("exceljs")) as ExcelNS & { default?: ExcelNS };
    const ExcelJS: ExcelNS = mod.default ?? mod;
    const wb = rakitWorkbook(ExcelJS);
    const buffer = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
    const namaFile = `denka-${new Date().toISOString().slice(0, 10)}.xlsx`;

    if (isTauri()) {
      const path = await save({
        defaultPath: namaFile,
        filters: [{ name: "Excel", extensions: ["xlsx"] }],
      });
      if (!path) return { sukses: false, pesan: "Ekspor dibatalkan." };
      await writeFile(path, new Uint8Array(buffer));
      return { sukses: true, pesan: "Data berhasil diekspor ke Excel." };
    }

    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const tautan = document.createElement("a");
    tautan.href = url;
    tautan.download = namaFile;
    tautan.click();
    URL.revokeObjectURL(url);
    return { sukses: true, pesan: "Data berhasil diekspor ke Excel." };
  } catch (error) {
    const pesan =
      error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : "Gagal mengekspor data.";
    return { sukses: false, pesan };
  }
}
