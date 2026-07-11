import type { SnapshotDatabase } from "../Database";
import type { DataBarang, KategoriBarang } from "../entities/Barang";
import type { DataSupplier } from "../entities/Supplier";
import type { DataPengguna, RolePengguna } from "../entities/Pengguna";
import type {
  MetodePembayaran,
  TipeDiskon,
  TransaksiJSON,
} from "../entities/TransaksiPenjualan";
import type {
  PrioritasService,
  ServiceOrderJSON,
  StatusService,
} from "../entities/ServiceOrder";
import type { AlasanKeluar, MutasiStokJSON } from "../entities/MutasiStok";

// Baris tabel Supabase — nama kolom mengikuti backend/supabase/schema.sql.

export interface UserRow {
  id: string;
  name: string;
  username: string;
  email: string;
  password: string;
  role: string;
  active: boolean;
  last_login: string | null;
}

export interface SupplierRow {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  items_supplied: string | null;
}

export interface ProductRow {
  id: string;
  code: string;
  name: string;
  category: string;
  purchase_price: number;
  sell_price: number;
  stock: number;
  min_stock: number;
  supplier: string | null;
  specification: string | null;
}

export interface SaleRow {
  id: string;
  number: string;
  sold_at: string;
  cashier_name: string | null;
  discount_type: string | null;
  discount_value: number;
  payment_method: string;
  amount_paid: number;
  customer_whatsapp: string | null;
}

export interface SaleItemRow {
  id: string;
  sale_id: string;
  product_id: string | null;
  product_name: string;
  unit_price: number;
  unit_cost: number;
  quantity: number;
}

export interface ServiceOrderRow {
  id: string;
  number: string;
  customer_name: string;
  customer_phone: string | null;
  customer_address: string | null;
  unit_type: string | null;
  brand: string | null;
  model: string | null;
  serial_no: string | null;
  accessories: string | null;
  complaint: string | null;
  diagnosis: string | null;
  technician: string | null;
  priority: string | null;
  status: string;
  received_at: string;
  service_fee: number;
}

export interface ServicePartRow {
  id: string;
  service_order_id: string;
  product_id: string | null;
  name: string;
  quantity: number;
  price: number;
}

export interface ServiceHistoryRow {
  id: string;
  service_order_id: string;
  status: string;
  changed_at: string;
}

export interface StockMovementRow {
  id: string;
  kind: string;
  product_name: string;
  quantity: number;
  moved_at: string;
  recorded_by: string | null;
  note: string | null;
  supplier: string | null;
  unit_price: number | null;
  invoice_no: string | null;
  reason: string | null;
}

export interface CloudTables {
  users: UserRow[];
  suppliers: SupplierRow[];
  products: ProductRow[];
  sales: SaleRow[];
  sale_items: SaleItemRow[];
  service_orders: ServiceOrderRow[];
  service_parts: ServicePartRow[];
  service_status_history: ServiceHistoryRow[];
  stock_movements: StockMovementRow[];
}

/** Snapshot lokal → baris-baris tabel Supabase (ternormalisasi). */
export function snapshotToTables(snap: SnapshotDatabase): CloudTables {
  const users: UserRow[] = snap.pengguna.map((u) => ({
    id: u.id,
    name: u.nama,
    username: u.username,
    email: u.email,
    password: u.password,
    role: u.role,
    active: u.aktif,
    last_login: u.terakhirLogin ? new Date(u.terakhirLogin).toISOString() : null,
  }));

  const suppliers: SupplierRow[] = snap.supplier.map((s) => ({
    id: s.id,
    name: s.nama,
    contact_person: s.kontakPerson || null,
    phone: s.telepon || null,
    address: s.alamat || null,
    notes: s.catatan ?? null,
    items_supplied: s.barangDisuplai ? JSON.stringify(s.barangDisuplai) : null,
  }));

  const products: ProductRow[] = snap.barang.map((b) => ({
    id: b.id,
    code: b.kode,
    name: b.nama,
    category: b.kategori,
    purchase_price: b.hargaBeli,
    sell_price: b.hargaJual,
    stock: b.stok,
    min_stock: b.stokMinimum,
    supplier: b.supplier || null,
    specification: b.spesifikasi ?? null,
  }));

  const sales: SaleRow[] = [];
  const sale_items: SaleItemRow[] = [];
  for (const t of snap.transaksi) {
    sales.push({
      id: t.id,
      number: t.nomor,
      sold_at: t.tanggal,
      cashier_name: t.kasir || null,
      discount_type: t.tipeDiskon,
      discount_value: t.nilaiDiskon,
      payment_method: t.metode,
      amount_paid: t.uangDiterima,
      customer_whatsapp: t.whatsappPelanggan ?? null,
    });
    t.items.forEach((item, index) => {
      sale_items.push({
        id: `${t.id}-${index}`,
        sale_id: t.id,
        product_id: item.barangId || null,
        product_name: item.namaBarang,
        unit_price: item.hargaSatuan,
        unit_cost: item.hargaBeliSatuan,
        quantity: item.jumlah,
      });
    });
  }

  const service_orders: ServiceOrderRow[] = [];
  const service_parts: ServicePartRow[] = [];
  const service_status_history: ServiceHistoryRow[] = [];
  for (const s of snap.service) {
    service_orders.push({
      id: s.id,
      number: s.nomor,
      customer_name: s.pelanggan,
      customer_phone: s.telepon || null,
      customer_address: s.alamat ?? null,
      unit_type: s.jenisUnit || null,
      brand: s.merk || null,
      model: s.model ?? null,
      serial_no: s.nomorSeri ?? null,
      accessories: s.kelengkapan ? JSON.stringify(s.kelengkapan) : null,
      complaint: s.keluhan || null,
      diagnosis: s.diagnosa ?? null,
      technician: s.teknisi || null,
      priority: s.prioritas,
      status: s.status,
      received_at: s.tanggalMasuk,
      service_fee: s.biayaJasa,
    });
    s.sparepart.forEach((part) => {
      service_parts.push({
        id: part.id,
        service_order_id: s.id,
        product_id: part.barangId || null,
        name: part.nama,
        quantity: part.jumlah,
        price: part.harga,
      });
    });
    s.riwayat.forEach((log, index) => {
      service_status_history.push({
        id: `${s.id}-${index}`,
        service_order_id: s.id,
        status: log.status,
        changed_at: log.pada,
      });
    });
  }

  const stock_movements: StockMovementRow[] = snap.mutasiStok.map((m) => ({
    id: m.id,
    kind: m.jenis,
    product_name: m.namaBarang,
    quantity: m.jumlah,
    moved_at: m.tanggal,
    recorded_by: m.dicatatOleh || null,
    note: m.catatan ?? null,
    supplier: m.supplier ?? null,
    unit_price: m.hargaSatuan ?? null,
    invoice_no: m.noFaktur ?? null,
    reason: m.alasan ?? null,
  }));

  return {
    users,
    suppliers,
    products,
    sales,
    sale_items,
    service_orders,
    service_parts,
    service_status_history,
    stock_movements,
  };
}

/** Baris-baris tabel Supabase → snapshot lokal (siap dihidrasi Database). */
export function tablesToSnapshot(t: CloudTables): SnapshotDatabase {
  const barang: DataBarang[] = t.products.map((p) => ({
    id: p.id,
    kode: p.code,
    nama: p.name,
    kategori: p.category as KategoriBarang,
    hargaBeli: Number(p.purchase_price),
    hargaJual: Number(p.sell_price),
    stok: Number(p.stock),
    stokMinimum: Number(p.min_stock),
    supplier: p.supplier ?? "",
    spesifikasi: p.specification ?? undefined,
  }));

  const supplier: DataSupplier[] = t.suppliers.map((s) => ({
    id: s.id,
    nama: s.name,
    kontakPerson: s.contact_person ?? "",
    telepon: s.phone ?? "",
    alamat: s.address ?? "",
    catatan: s.notes ?? undefined,
    barangDisuplai: parseArray(s.items_supplied),
  }));

  const pengguna: DataPengguna[] = t.users.map((u) => ({
    id: u.id,
    nama: u.name,
    username: u.username,
    email: u.email,
    password: u.password,
    role: u.role as RolePengguna,
    aktif: Boolean(u.active),
    terakhirLogin: u.last_login ? new Date(u.last_login) : null,
  }));

  const itemsBySale = groupBy(t.sale_items, (r) => r.sale_id);
  const transaksi: TransaksiJSON[] = t.sales.map((s) => ({
    id: s.id,
    nomor: s.number,
    tanggal: s.sold_at,
    kasir: s.cashier_name ?? "",
    items: (itemsBySale.get(s.id) ?? []).sort(byIdSuffix).map((item) => ({
      barangId: item.product_id ?? "",
      namaBarang: item.product_name,
      hargaSatuan: Number(item.unit_price),
      hargaBeliSatuan: Number(item.unit_cost),
      jumlah: Number(item.quantity),
    })),
    tipeDiskon: (s.discount_type ?? "rp") as TipeDiskon,
    nilaiDiskon: Number(s.discount_value),
    metode: s.payment_method as MetodePembayaran,
    uangDiterima: Number(s.amount_paid),
    whatsappPelanggan: s.customer_whatsapp ?? undefined,
  }));

  const partsByOrder = groupBy(t.service_parts, (r) => r.service_order_id);
  const historyByOrder = groupBy(t.service_status_history, (r) => r.service_order_id);
  const service: ServiceOrderJSON[] = t.service_orders.map((s) => ({
    id: s.id,
    nomor: s.number,
    pelanggan: s.customer_name,
    telepon: s.customer_phone ?? "",
    alamat: s.customer_address ?? undefined,
    jenisUnit: s.unit_type ?? "",
    merk: s.brand ?? "",
    model: s.model ?? undefined,
    nomorSeri: s.serial_no ?? undefined,
    kelengkapan: parseArray(s.accessories),
    keluhan: s.complaint ?? "",
    diagnosa: s.diagnosis ?? undefined,
    teknisi: s.technician ?? "",
    prioritas: (s.priority ?? "normal") as PrioritasService,
    status: s.status as StatusService,
    tanggalMasuk: s.received_at,
    biayaJasa: Number(s.service_fee),
    sparepart: (partsByOrder.get(s.id) ?? []).map((part) => ({
      id: part.id,
      barangId: part.product_id ?? "",
      nama: part.name,
      jumlah: Number(part.quantity),
      harga: Number(part.price),
    })),
    riwayat: (historyByOrder.get(s.id) ?? [])
      .slice()
      .sort((a, b) => a.changed_at.localeCompare(b.changed_at))
      .map((log) => ({ status: log.status as StatusService, pada: log.changed_at })),
  }));

  const mutasiStok: MutasiStokJSON[] = t.stock_movements.map((m) => ({
    jenis: m.kind === "masuk" ? "masuk" : "keluar",
    id: m.id,
    tanggal: m.moved_at,
    namaBarang: m.product_name,
    jumlah: Number(m.quantity),
    dicatatOleh: m.recorded_by ?? "",
    catatan: m.note ?? undefined,
    supplier: m.supplier ?? undefined,
    hargaSatuan: m.unit_price ?? undefined,
    noFaktur: m.invoice_no ?? undefined,
    alasan: (m.reason ?? undefined) as AlasanKeluar | undefined,
  }));

  return { versi: 1, barang, supplier, pengguna, transaksi, service, mutasiStok };
}

function parseArray(text: string | null): string[] {
  if (!text) return [];
  try {
    const value = JSON.parse(text);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function groupBy<T>(rows: T[], kunci: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const k = kunci(row);
    const daftar = map.get(k);
    if (daftar) daftar.push(row);
    else map.set(k, [row]);
  }
  return map;
}

/** Urutkan baris anak berdasarkan sufiks angka pada id (`<induk>-<index>`). */
function byIdSuffix(a: { id: string }, b: { id: string }): number {
  return Number(a.id.split("-").pop()) - Number(b.id.split("-").pop());
}
