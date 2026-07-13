import type { Workbook } from "exceljs";
import { isTauri } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { Database } from "../Database";
import { LABEL_PAYMENT_METHOD } from "../entities/Sale";
import { StockIn, type StockMovement } from "../entities/StockMovement";

/** exceljs cukup besar, jadi dimuat hanya saat fitur ekspor dipakai. */
type ExcelNS = typeof import("exceljs");

export interface ExportResult {
  success: boolean;
  message: string;
}

const STOCK_STATUS_LABEL: Record<string, string> = {
  aman: "Aman",
  menipis: "Menipis",
  habis: "Habis",
};

function formatDate(value: Date): string {
  return value.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function movementNote(m: StockMovement): string {
  if (m instanceof StockIn) return `Masuk dari ${m.supplier}`;
  return "Keluar";
}

/** Rakit workbook multi-sheet dari data lokal (bekerja penuh saat offline). */
function buildWorkbook(ExcelJS: ExcelNS, from?: Date, to?: Date): Workbook {
  const db = Database.getInstance();
  const wb = new ExcelJS.Workbook();
  wb.created = new Date();

  // Batasi sheet berbasis tanggal ke rentang yang dipilih (jika ada).
  const fromTs = from ? new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime() : -Infinity;
  const toTs = to ? new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999).getTime() : Infinity;
  const inRange = (d: Date) => d.getTime() >= fromTs && d.getTime() <= toTs;
  const sales = db.sales.findAll().filter((s) => inRange(s.date));
  const services = db.services.findAll().filter((s) => inRange(s.receivedAt));
  const movements = db.stockMovements.findAll().filter((m) => inRange(m.date));

  const salesSheet = wb.addWorksheet("Penjualan");
  salesSheet.columns = [
    { header: "Nomor", key: "number", width: 16 },
    { header: "Tanggal", key: "date", width: 16 },
    { header: "Kasir", key: "cashier", width: 20 },
    { header: "Metode", key: "method", width: 16 },
    { header: "Jumlah Item", key: "itemCount", width: 12 },
    { header: "Subtotal", key: "subtotal", width: 16, style: { numFmt: "#,##0" } },
    { header: "Diskon", key: "discount", width: 14, style: { numFmt: "#,##0" } },
    { header: "Total", key: "total", width: 16, style: { numFmt: "#,##0" } },
  ];
  for (const t of sales) {
    salesSheet.addRow({
      number: t.number,
      date: formatDate(t.date),
      cashier: t.cashier,
      method: LABEL_PAYMENT_METHOD[t.method],
      itemCount: t.itemCount(),
      subtotal: t.subtotal(),
      discount: t.discount(),
      total: t.total(),
    });
  }

  const itemsSheet = wb.addWorksheet("Item Penjualan");
  itemsSheet.columns = [
    { header: "No. Transaksi", key: "number", width: 16 },
    { header: "Barang", key: "product", width: 30 },
    { header: "Harga", key: "price", width: 14, style: { numFmt: "#,##0" } },
    { header: "Jumlah", key: "quantity", width: 10 },
    { header: "Subtotal", key: "subtotal", width: 16, style: { numFmt: "#,##0" } },
  ];
  for (const t of sales) {
    for (const d of t.items) {
      itemsSheet.addRow({
        number: t.number,
        product: d.productName,
        price: d.unitPrice,
        quantity: d.quantity,
        subtotal: d.subtotal(),
      });
    }
  }

  const productsSheet = wb.addWorksheet("Barang");
  productsSheet.columns = [
    { header: "Kode", key: "code", width: 14 },
    { header: "Nama", key: "name", width: 30 },
    { header: "Kategori", key: "category", width: 16 },
    { header: "Harga Beli", key: "purchasePrice", width: 16, style: { numFmt: "#,##0" } },
    { header: "Harga Jual", key: "sellPrice", width: 16, style: { numFmt: "#,##0" } },
    { header: "Stok", key: "stock", width: 10 },
    { header: "Stok Minimum", key: "minStock", width: 14 },
    { header: "Status", key: "status", width: 12 },
  ];
  for (const b of db.products.findAll()) {
    productsSheet.addRow({
      code: b.code,
      name: b.name,
      category: b.category,
      purchasePrice: b.purchasePrice,
      sellPrice: b.sellPrice,
      stock: b.stock,
      minStock: b.minStock,
      status: STOCK_STATUS_LABEL[b.stockStatus()] ?? b.stockStatus(),
    });
  }

  const serviceSheet = wb.addWorksheet("Service");
  serviceSheet.columns = [
    { header: "Nomor", key: "number", width: 14 },
    { header: "Tanggal Masuk", key: "date", width: 16 },
    { header: "Pelanggan", key: "customer", width: 24 },
    { header: "Telepon", key: "phone", width: 16 },
    { header: "Unit", key: "unit", width: 16 },
    { header: "Merk", key: "brand", width: 18 },
    { header: "Status", key: "status", width: 14 },
    { header: "Teknisi", key: "technician", width: 18 },
    { header: "Total Biaya", key: "cost", width: 16, style: { numFmt: "#,##0" } },
  ];
  for (const s of services) {
    serviceSheet.addRow({
      number: s.number,
      date: formatDate(s.receivedAt),
      customer: s.customer,
      phone: s.phone,
      unit: s.unitType,
      brand: s.brand,
      status: s.status,
      technician: s.technician,
      cost: s.totalCost(),
    });
  }

  const movementsSheet = wb.addWorksheet("Mutasi Stok");
  movementsSheet.columns = [
    { header: "Jenis", key: "kind", width: 10 },
    { header: "Tanggal", key: "date", width: 16 },
    { header: "Barang", key: "product", width: 30 },
    { header: "Jumlah", key: "quantity", width: 10 },
    { header: "Keterangan", key: "note", width: 26 },
    { header: "Catatan", key: "notes", width: 30 },
    { header: "Dicatat Oleh", key: "by", width: 18 },
  ];
  for (const m of movements) {
    movementsSheet.addRow({
      kind: m.kind === "masuk" ? "Masuk" : "Keluar",
      date: formatDate(m.date),
      product: m.productName,
      quantity: m.quantity,
      note: movementNote(m),
      notes: m.note ?? "",
      by: m.recordedBy,
    });
  }

  for (const ws of wb.worksheets) ws.getRow(1).font = { bold: true };
  return wb;
}

/**
 * Ekspor data ke berkas .xlsx (dialog simpan di desktop, unduh di browser).
 * Jika `from`/`to` diisi, sheet berbasis tanggal (penjualan, item, service,
 * mutasi) dibatasi ke rentang itu; sheet Barang selalu stok terkini.
 */
export async function exportToExcel(from?: Date, to?: Date): Promise<ExportResult> {
  try {
    const mod = (await import("exceljs")) as ExcelNS & { default?: ExcelNS };
    const ExcelJS: ExcelNS = mod.default ?? mod;
    const wb = buildWorkbook(ExcelJS, from, to);
    const buffer = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const fileName =
      from && to ? `denka-laporan-${iso(from)}_${iso(to)}.xlsx` : `denka-${iso(new Date())}.xlsx`;

    if (isTauri()) {
      const path = await save({
        defaultPath: fileName,
        filters: [{ name: "Excel", extensions: ["xlsx"] }],
      });
      if (!path) return { success: false, message: "Ekspor dibatalkan." };
      await writeFile(path, new Uint8Array(buffer));
      return { success: true, message: "Data berhasil diekspor ke Excel." };
    }

    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    return { success: true, message: "Data berhasil diekspor ke Excel." };
  } catch (error) {
    const message =
      error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : "Gagal mengekspor data.";
    return { success: false, message };
  }
}
