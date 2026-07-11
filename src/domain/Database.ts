import { Barang } from "./entities/Barang";
import { Supplier } from "./entities/Supplier";
import { Pengguna } from "./entities/Pengguna";
import {
  DetailTransaksi,
  TransaksiPenjualan,
  type MetodePembayaran,
} from "./entities/TransaksiPenjualan";
import {
  RiwayatStatus,
  ServiceOrder,
  type ServiceOrderJSON,
  type StatusService,
} from "./entities/ServiceOrder";
import {
  BarangKeluar,
  BarangMasuk,
  mutasiDariJSON,
  mutasiKeJSON,
  type MutasiStokJSON,
} from "./entities/MutasiStok";
import type { TransaksiJSON } from "./entities/TransaksiPenjualan";
import type { DataBarang } from "./entities/Barang";
import type { DataSupplier } from "./entities/Supplier";
import { PenyimpananLokal } from "./persistence/PenyimpananLokal";
import { BarangRepository } from "./repositories/BarangRepository";
import { SupplierRepository } from "./repositories/SupplierRepository";
import { PenggunaRepository } from "./repositories/PenggunaRepository";
import { TransaksiRepository } from "./repositories/TransaksiRepository";
import { ServiceRepository } from "./repositories/ServiceRepository";
import { MutasiStokRepository } from "./repositories/MutasiStokRepository";

/** Tanggal `n` hari yang lalu pada jam tertentu — agar data demo selalu relevan. */
function hariLalu(n: number, jam = 10, menit = 0): Date {
  const tanggal = new Date();
  tanggal.setDate(tanggal.getDate() - n);
  tanggal.setHours(jam, menit, 0, 0);
  return tanggal;
}

/** Bentuk seluruh isi database saat disimpan ke penyimpanan lokal. */
export interface SnapshotDatabase {
  versi: number;
  barang: DataBarang[];
  supplier: DataSupplier[];
  pengguna: ReturnType<Pengguna["toJSON"]>[];
  transaksi: TransaksiJSON[];
  service: ServiceOrderJSON[];
  mutasiStok: MutasiStokJSON[];
}

const KUNCI_DATA = "denka-db";
const VERSI_DATA = 1;

/**
 * Database — Singleton yang menampung seluruh repository (simulasi database).
 * Semua controller mengambil data lewat satu instance ini sehingga
 * modul POS, stok, service, dan laporan berbagi data yang sama.
 *
 * Persistensi: seluruh isi repository otomatis disimpan ke localStorage
 * setiap ada perubahan, dan dimuat kembali saat aplikasi dibuka.
 */
export class Database {
  private static instance: Database | null = null;

  readonly barang = new BarangRepository();
  readonly supplier = new SupplierRepository();
  readonly pengguna = new PenggunaRepository();
  readonly transaksi = new TransaksiRepository();
  readonly service = new ServiceRepository();
  readonly mutasiStok = new MutasiStokRepository();

  private timerSimpan: ReturnType<typeof setTimeout> | null = null;

  private constructor() {
    const tersimpan = PenyimpananLokal.muat<SnapshotDatabase>(KUNCI_DATA);
    if (tersimpan && tersimpan.versi === VERSI_DATA) {
      this.hidrasi(tersimpan);
    } else {
      this.seedSemua();
    }
    this.pasangAutoSimpan();
  }

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  private get semuaRepository() {
    return [this.barang, this.supplier, this.pengguna, this.transaksi, this.service, this.mutasiStok];
  }

  // ---------- persistensi ----------

  /** Muat kembali seluruh entity dari snapshot JSON (revive tanggal & subclass). */
  private hidrasi(data: SnapshotDatabase): void {
    this.barang.seed(data.barang.map(Barang.dariJSON));
    this.supplier.seed(data.supplier.map(Supplier.dariJSON));
    this.pengguna.seed(data.pengguna.map(Pengguna.dariJSON));
    this.transaksi.seed(data.transaksi.map(TransaksiPenjualan.dariJSON));
    this.service.seed(data.service.map(ServiceOrder.dariJSON));
    this.mutasiStok.seed(data.mutasiStok.map(mutasiDariJSON));
  }

  private snapshot(): SnapshotDatabase {
    return {
      versi: VERSI_DATA,
      barang: this.barang.findAll().map((row) => row.toJSON()),
      supplier: this.supplier.findAll().map((row) => row.toJSON()),
      pengguna: this.pengguna.findAll().map((row) => row.toJSON()),
      transaksi: this.transaksi.findAll().map((row) => row.toJSON()),
      service: this.service.findAll().map((row) => row.toJSON()),
      mutasiStok: this.mutasiStok.findAll().map(mutasiKeJSON),
    };
  }

  /** Simpan otomatis (debounce) setiap ada perubahan di repository mana pun. */
  private pasangAutoSimpan(): void {
    if (!PenyimpananLokal.tersedia) return;
    const jadwalkan = () => {
      if (this.timerSimpan) clearTimeout(this.timerSimpan);
      this.timerSimpan = setTimeout(() => {
        PenyimpananLokal.simpan(KUNCI_DATA, this.snapshot());
      }, 250);
    };
    this.semuaRepository.forEach((repo) => repo.subscribe(jadwalkan));
  }

  /** Snapshot seluruh data — dipakai modul sinkronisasi untuk backup ke cloud. */
  ambilSnapshot(): SnapshotDatabase {
    return this.snapshot();
  }

  /** Ganti seluruh isi database dari snapshot — dipakai saat restore dari cloud. */
  gantiSemua(data: SnapshotDatabase): void {
    this.hidrasi(data);
    this.semuaRepository.forEach((repo) => repo.touch());
  }

  /** Daftarkan callback yang dipanggil setiap ada perubahan di repository mana pun. */
  onChange(pendengar: () => void): void {
    this.semuaRepository.forEach((repo) => repo.subscribe(pendengar));
  }

  /** Kembalikan seluruh data ke kondisi awal (seed) dan hapus penyimpanan. */
  resetKeSeedAwal(): void {
    PenyimpananLokal.hapus(KUNCI_DATA);
    this.seedSemua();
    this.semuaRepository.forEach((repo) => repo.touch());
  }

  private seedSemua(): void {
    this.seedSupplier();
    this.seedBarang();
    this.seedPengguna();
    this.seedTransaksi();
    this.seedService();
    this.seedMutasiStok();
  }

  // ---------- seed data awal ----------

  private seedSupplier(): void {
    this.supplier.seed([
      new Supplier({
        id: "sup1", nama: "PT Sumber Komputer", kontakPerson: "Hendra Gunawan",
        telepon: "081234500011", alamat: "Jl. Mangga Dua Raya No. 12, Jakarta Pusat",
        catatan: "Supplier utama laptop & SSD, pembayaran tempo 14 hari.",
        barangDisuplai: ["Laptop ASUS Vivobook 14", "Macbook Air M1", "SSD NVMe 512GB", "PC Rakitan Gaming"],
      }),
      new Supplier({
        id: "sup2", nama: "CV Elektronik Jaya", kontakPerson: "Lisa Permata",
        telepon: "082199900022", alamat: "Jl. Kenari No. 45, Bandung",
        barangDisuplai: ["Laptop Lenovo IdeaPad 3", "Headset Gaming", "Tas Laptop 14\""],
      }),
      new Supplier({
        id: "sup3", nama: "Toko Grosir IT", kontakPerson: "Budi Santoso",
        telepon: "081333300033", alamat: "Ruko ITC Lt. 2 Blok C, Surabaya",
        catatan: "Harga grosir aksesoris paling kompetitif.",
        barangDisuplai: ["Mouse Wireless Logitech", "Keyboard Mechanical RGB", "Power Supply 500W", "Thermal Paste"],
      }),
      new Supplier({
        id: "sup4", nama: "PT Maju Teknologi", kontakPerson: "Rina Astuti",
        telepon: "085700000044", alamat: "Jl. Gajah Mada No. 8, Semarang",
        barangDisuplai: ["Laptop Acer Aspire 5", "RAM DDR4 8GB", "Cooling Pad"],
      }),
    ]);
  }

  private seedBarang(): void {
    this.barang.seed([
      new Barang({ id: "i1", kode: "LP-001", nama: "Laptop ASUS Vivobook 14", kategori: "laptop", hargaBeli: 6200000, hargaJual: 7000000, stok: 5, stokMinimum: 3, supplier: "PT Sumber Komputer", spesifikasi: "Ryzen 5 / 8GB / 512GB SSD" }),
      new Barang({ id: "i2", kode: "LP-002", nama: "Laptop Acer Aspire 5", kategori: "laptop", hargaBeli: 7600000, hargaJual: 8500000, stok: 3, stokMinimum: 3, supplier: "PT Maju Teknologi", spesifikasi: "Core i5 / 8GB / 512GB SSD" }),
      new Barang({ id: "i3", kode: "LP-003", nama: "Macbook Air M1", kategori: "laptop", hargaBeli: 13000000, hargaJual: 14500000, stok: 2, stokMinimum: 3, supplier: "PT Sumber Komputer", spesifikasi: "Apple M1 / 8GB / 256GB" }),
      new Barang({ id: "i4", kode: "LP-004", nama: "Laptop Lenovo IdeaPad 3", kategori: "laptop", hargaBeli: 5500000, hargaJual: 6200000, stok: 0, stokMinimum: 2, supplier: "CV Elektronik Jaya", spesifikasi: "Core i3 / 8GB / 256GB SSD" }),
      new Barang({ id: "i5", kode: "PC-001", nama: "PC Rakitan Gaming", kategori: "pc", hargaBeli: 11000000, hargaJual: 12500000, stok: 2, stokMinimum: 2, supplier: "PT Sumber Komputer", spesifikasi: "Ryzen 5 5600 / RTX 3060 / 16GB" }),
      new Barang({ id: "i15", kode: "PC-002", nama: "Motherboard B550M", kategori: "pc", hargaBeli: 1500000, hargaJual: 1750000, stok: 5, stokMinimum: 2, supplier: "PT Sumber Komputer", spesifikasi: "AM4 / DDR4 / mATX" }),
      new Barang({ id: "i16", kode: "PC-003", nama: "Processor Ryzen 5 5600", kategori: "pc", hargaBeli: 1650000, hargaJual: 1900000, stok: 6, stokMinimum: 2, supplier: "PT Maju Teknologi", spesifikasi: "6 Core / 12 Thread / AM4" }),
      new Barang({ id: "i6", kode: "SP-001", nama: "SSD NVMe 512GB", kategori: "sparepart", hargaBeli: 720000, hargaJual: 900000, stok: 3, stokMinimum: 5, supplier: "PT Sumber Komputer", spesifikasi: "PCIe Gen3 / 2400MB/s" }),
      new Barang({ id: "i7", kode: "SP-002", nama: "RAM DDR4 8GB", kategori: "sparepart", hargaBeli: 350000, hargaJual: 450000, stok: 9, stokMinimum: 5, supplier: "PT Maju Teknologi", spesifikasi: "3200MHz / SODIMM" }),
      new Barang({ id: "i8", kode: "AC-001", nama: "Mouse Wireless Logitech", kategori: "aksesoris", hargaBeli: 110000, hargaJual: 150000, stok: 24, stokMinimum: 5, supplier: "Toko Grosir IT", spesifikasi: "2.4GHz / 1000 DPI" }),
      new Barang({ id: "i9", kode: "AC-002", nama: "Keyboard Mechanical RGB", kategori: "aksesoris", hargaBeli: 350000, hargaJual: 450000, stok: 12, stokMinimum: 4, supplier: "Toko Grosir IT", spesifikasi: "Blue Switch / TKL" }),
      new Barang({ id: "i10", kode: "AC-003", nama: "Headset Gaming", kategori: "aksesoris", hargaBeli: 240000, hargaJual: 320000, stok: 0, stokMinimum: 4, supplier: "CV Elektronik Jaya", spesifikasi: "7.1 Surround / USB" }),
      new Barang({ id: "i11", kode: "SP-003", nama: "Power Supply 500W", kategori: "sparepart", hargaBeli: 430000, hargaJual: 550000, stok: 6, stokMinimum: 3, supplier: "Toko Grosir IT", spesifikasi: "80+ Bronze / Non-modular" }),
      new Barang({ id: "i12", kode: "LN-001", nama: "Thermal Paste", kategori: "lainnya", hargaBeli: 30000, hargaJual: 45000, stok: 30, stokMinimum: 10, supplier: "Toko Grosir IT", spesifikasi: "Tube 4g / 8.5 W/mK" }),
      new Barang({ id: "i13", kode: "LN-002", nama: "Tas Laptop 14\"", kategori: "lainnya", hargaBeli: 85000, hargaJual: 120000, stok: 15, stokMinimum: 5, supplier: "CV Elektronik Jaya", spesifikasi: "Waterproof / Slot 14 inch" }),
      new Barang({ id: "i14", kode: "LN-003", nama: "Cooling Pad", kategori: "lainnya", hargaBeli: 130000, hargaJual: 175000, stok: 9, stokMinimum: 4, supplier: "PT Maju Teknologi", spesifikasi: "5 Fan / RGB / 17 inch" }),
    ]);
  }

  private seedPengguna(): void {
    this.pengguna.seed([
      new Pengguna({ id: "u1", nama: "Budi Denka", username: "budi", email: "budi@denkacomputer.id", password: "denka123", role: "pemilik", aktif: true, terakhirLogin: hariLalu(0, 8, 15) }),
      new Pengguna({ id: "u2", nama: "Sari Admin", username: "sari", email: "sari@denkacomputer.id", password: "sari123", role: "admin", aktif: true, terakhirLogin: hariLalu(0, 9, 2) }),
      new Pengguna({ id: "u3", nama: "Rizki Teknisi", username: "rizki", email: "rizki@denkacomputer.id", password: "rizki123", role: "admin", aktif: true, terakhirLogin: hariLalu(1, 16, 40) }),
      new Pengguna({ id: "u4", nama: "Agus Pratama", username: "agus", email: "agus@denkacomputer.id", password: "agus123", role: "admin", aktif: false, terakhirLogin: hariLalu(8, 11, 25) }),
    ]);
  }

  private seedTransaksi(): void {
    // helper: buat DetailTransaksi dari kode barang yang sudah di-seed
    const detail = (kode: string, jumlah: number): DetailTransaksi => {
      const barang = this.barang.findByKode(kode);
      if (!barang) throw new Error(`Seed transaksi: barang ${kode} tidak ditemukan.`);
      return new DetailTransaksi(barang.id, barang.nama, barang.hargaJual, barang.hargaBeli, jumlah);
    };

    type SeedTrx = {
      hari: number; jam: number; kasir: string;
      metode: MetodePembayaran; items: [string, number][]; diskon?: number;
    };

    const daftar: SeedTrx[] = [
      // hari ini & minggu berjalan
      { hari: 0, jam: 9, kasir: "Sari Admin", metode: "tunai", items: [["AC-001", 2], ["LN-001", 3]] },
      { hari: 0, jam: 11, kasir: "Budi Denka", metode: "transfer", items: [["LP-001", 1]] },
      { hari: 0, jam: 14, kasir: "Sari Admin", metode: "qris", items: [["SP-002", 2], ["AC-002", 1]] },
      { hari: 1, jam: 10, kasir: "Sari Admin", metode: "tunai", items: [["SP-001", 2], ["LN-001", 2]] },
      { hari: 1, jam: 15, kasir: "Budi Denka", metode: "qris", items: [["LN-003", 1], ["AC-001", 3]] },
      { hari: 2, jam: 11, kasir: "Sari Admin", metode: "transfer", items: [["LP-002", 1], ["LN-002", 1]] },
      { hari: 3, jam: 13, kasir: "Sari Admin", metode: "tunai", items: [["AC-002", 2], ["SP-003", 1]] },
      { hari: 4, jam: 10, kasir: "Budi Denka", metode: "tunai", items: [["SP-002", 3]], diskon: 50000 },
      { hari: 5, jam: 16, kasir: "Sari Admin", metode: "qris", items: [["LP-001", 1], ["AC-001", 1], ["LN-002", 1]] },
      { hari: 6, jam: 12, kasir: "Sari Admin", metode: "tunai", items: [["LN-001", 5], ["AC-001", 2]] },
      // minggu-minggu sebelumnya (untuk laporan tren & keuntungan)
      { hari: 9, jam: 11, kasir: "Budi Denka", metode: "transfer", items: [["PC-001", 1]] },
      { hari: 11, jam: 14, kasir: "Sari Admin", metode: "tunai", items: [["SP-001", 3], ["SP-002", 2]] },
      { hari: 13, jam: 10, kasir: "Sari Admin", metode: "qris", items: [["AC-002", 3], ["LN-003", 2]] },
      { hari: 16, jam: 15, kasir: "Budi Denka", metode: "transfer", items: [["LP-003", 1]] },
      { hari: 18, jam: 11, kasir: "Sari Admin", metode: "tunai", items: [["AC-001", 4], ["LN-001", 4]] },
      { hari: 20, jam: 13, kasir: "Sari Admin", metode: "tunai", items: [["SP-003", 2], ["PC-002", 1]] },
      { hari: 23, jam: 10, kasir: "Budi Denka", metode: "qris", items: [["LP-001", 1], ["SP-002", 1]] },
      { hari: 25, jam: 16, kasir: "Sari Admin", metode: "transfer", items: [["PC-003", 2]] },
      { hari: 27, jam: 12, kasir: "Sari Admin", metode: "tunai", items: [["AC-001", 5], ["LN-002", 2]] },
    ];

    let nomor = 1023;
    const transaksi = daftar
      .slice()
      .reverse()
      .map(
        (seed, index) =>
          new TransaksiPenjualan({
            id: "trx-seed-" + index,
            nomor: "TRX-" + nomor++,
            tanggal: hariLalu(seed.hari, seed.jam),
            kasir: seed.kasir,
            items: seed.items.map(([kode, jumlah]) => detail(kode, jumlah)),
            tipeDiskon: "rp",
            nilaiDiskon: seed.diskon ?? 0,
            metode: seed.metode,
            uangDiterima: 0,
          }),
      )
      .reverse(); // terbaru di depan

    this.transaksi.seed(transaksi);
  }

  private seedService(): void {
    const riwayat = (langkah: [StatusService, number, number][]): RiwayatStatus[] =>
      langkah.map(([status, hari, jam]) => new RiwayatStatus(status, hariLalu(hari, jam)));

    this.service.seed([
      new ServiceOrder({
        id: "s6", nomor: "#SRV-0043", pelanggan: "Citra Dewanti", telepon: "081255566677",
        jenisUnit: "Laptop", merk: "Lenovo IdeaPad", model: "Slim 3",
        kelengkapan: ["Charger / Adaptor"], keluhan: "Keyboard beberapa tombol tidak berfungsi.",
        teknisi: "Agus Pratama", prioritas: "normal", status: "diperiksa", tanggalMasuk: hariLalu(0, 8),
        riwayat: riwayat([["antri", 0, 8], ["diperiksa", 0, 10]]),
      }),
      new ServiceOrder({
        id: "s1", nomor: "#SRV-0042", pelanggan: "Andi Saputra", telepon: "081234567890",
        jenisUnit: "Laptop", merk: "ASUS Vivobook", model: "X415", nomorSeri: "ASX-552310",
        kelengkapan: ["Charger / Adaptor"],
        keluhan: "Laptop mati total, tidak ada respon saat tombol power ditekan.",
        teknisi: "Rizki Teknisi", prioritas: "urgent", status: "dikerjakan",
        tanggalMasuk: hariLalu(1, 9), biayaJasa: 250000,
        riwayat: riwayat([["antri", 1, 9], ["diperiksa", 1, 11], ["dikerjakan", 1, 14]]),
      }),
      new ServiceOrder({
        id: "s2", nomor: "#SRV-0041", pelanggan: "Rina Wijaya", telepon: "082199887766",
        jenisUnit: "PC", merk: "Rakitan", keluhan: "PC sering restart sendiri saat main game.",
        teknisi: "Budi Denka", prioritas: "normal", status: "antri", tanggalMasuk: hariLalu(0, 10),
        riwayat: riwayat([["antri", 0, 10]]),
      }),
      new ServiceOrder({
        id: "s3", nomor: "#SRV-0040", pelanggan: "Toko Maju Jaya", telepon: "081311112222",
        jenisUnit: "Printer", merk: "Epson", model: "L3210",
        kelengkapan: ["Kabel Data"], keluhan: "Hasil cetak bergaris dan warna pudar.",
        diagnosa: "Head printer kotor, sudah dilakukan cleaning.",
        teknisi: "Agus Pratama", prioritas: "normal", status: "selesai",
        tanggalMasuk: hariLalu(3, 9), biayaJasa: 150000,
        riwayat: riwayat([["antri", 3, 9], ["diperiksa", 3, 11], ["dikerjakan", 3, 13], ["selesai", 2, 11]]),
      }),
      new ServiceOrder({
        id: "s4", nomor: "#SRV-0039", pelanggan: "Dewi Lestari", telepon: "085700001111",
        jenisUnit: "Laptop", merk: "HP Pavilion", model: "14-dv",
        kelengkapan: ["Charger / Adaptor", "Tas Laptop"], keluhan: "Layar pecah perlu ganti LCD.",
        diagnosa: "LCD retak, menunggu sparepart LCD 14 inch.",
        teknisi: "Rizki Teknisi", prioritas: "urgent", status: "sparepart",
        tanggalMasuk: hariLalu(2, 9), biayaJasa: 300000,
        riwayat: riwayat([["antri", 2, 9], ["diperiksa", 2, 13], ["dikerjakan", 2, 15], ["sparepart", 1, 10]]),
      }),
      new ServiceOrder({
        id: "s5", nomor: "#SRV-0038", pelanggan: "Bayu Pratama", telepon: "081888899900",
        jenisUnit: "Laptop", merk: "Apple Macbook", model: "Air M1",
        kelengkapan: ["Charger / Adaptor"], keluhan: "Upgrade penyimpanan dan bersih-bersih sistem.",
        diagnosa: "Upgrade SSD selesai, performa normal.",
        teknisi: "Budi Denka", prioritas: "normal", status: "diambil",
        tanggalMasuk: hariLalu(5, 9), biayaJasa: 200000,
        riwayat: riwayat([["antri", 5, 9], ["dikerjakan", 5, 13], ["selesai", 4, 10], ["diambil", 3, 16]]),
      }),
    ]);

    // sparepart terpakai pada service Bayu Pratama
    const service = this.service.findById("s5");
    const ssd = this.barang.findById("i6");
    if (service && ssd) {
      service.tambahSparepart(ssd.id, ssd.nama, 1, ssd.hargaJual);
    }
  }

  private seedMutasiStok(): void {
    this.mutasiStok.seed([
      new BarangKeluar({ id: "out1", tanggal: hariLalu(1, 9), namaBarang: "Keyboard Mechanical RGB", jumlah: 1, alasan: "rusak", catatan: "Switch tidak berfungsi, klaim garansi", dicatatOleh: "Sari Admin" }),
      new BarangMasuk({ id: "in1", tanggal: hariLalu(1, 8), namaBarang: "SSD NVMe 512GB", supplier: "PT Sumber Komputer", jumlah: 10, hargaSatuan: 720000, noFaktur: "FK-2026-0451", dicatatOleh: "Budi Denka" }),
      new BarangKeluar({ id: "out2", tanggal: hariLalu(2, 10), namaBarang: "Power Supply 500W", jumlah: 2, alasan: "retur", catatan: "Unit cacat produksi, dikembalikan ke supplier", dicatatOleh: "Budi Denka" }),
      new BarangMasuk({ id: "in2", tanggal: hariLalu(2, 9), namaBarang: "RAM DDR4 8GB", supplier: "PT Maju Teknologi", jumlah: 15, hargaSatuan: 350000, noFaktur: "FK-2026-0448", dicatatOleh: "Sari Admin" }),
      new BarangMasuk({ id: "in3", tanggal: hariLalu(3, 11), namaBarang: "Laptop ASUS Vivobook 14", supplier: "PT Sumber Komputer", jumlah: 3, hargaSatuan: 6200000, noFaktur: "FK-2026-0440", dicatatOleh: "Budi Denka" }),
      new BarangKeluar({ id: "out3", tanggal: hariLalu(4, 14), namaBarang: "SSD NVMe 512GB", jumlah: 1, alasan: "internal", catatan: "Dipakai untuk PC kasir toko", dicatatOleh: "Budi Denka" }),
      new BarangMasuk({ id: "in4", tanggal: hariLalu(5, 10), namaBarang: "Mouse Wireless Logitech", supplier: "Toko Grosir IT", jumlah: 30, hargaSatuan: 110000, dicatatOleh: "Sari Admin" }),
    ]);
  }
}
