import { Product } from "./entities/Product";
import { Supplier } from "./entities/Supplier";
import { User } from "./entities/User";
import {
  SaleItem,
  Sale,
  type PaymentMethod,
} from "./entities/Sale";
import {
  StatusLog,
  ServiceOrder,
  type ServiceOrderJSON,
  type ServiceStatus,
} from "./entities/ServiceOrder";
import {
  StockOut,
  StockIn,
  stockMovementFromJSON,
  stockMovementToJSON,
  type StockMovementJSON,
} from "./entities/StockMovement";
import type { SaleJSON } from "./entities/Sale";
import type { ProductData } from "./entities/Product";
import type { SupplierData } from "./entities/Supplier";
import { LocalStore } from "./persistence/LocalStore";
import { ProductRepository } from "./repositories/ProductRepository";
import { SupplierRepository } from "./repositories/SupplierRepository";
import { UserRepository } from "./repositories/UserRepository";
import { SaleRepository } from "./repositories/SaleRepository";
import { ServiceRepository } from "./repositories/ServiceRepository";
import { StockMovementRepository } from "./repositories/StockMovementRepository";

/** Tanggal `n` hari yang lalu pada jam tertentu — agar data demo selalu relevan. */
function daysAgo(n: number, hour = 10, minute = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() - n);
  date.setHours(hour, minute, 0, 0);
  return date;
}

/** Bentuk seluruh isi database saat disimpan ke penyimpanan lokal. */
export interface DatabaseSnapshot {
  version: number;
  products: ProductData[];
  suppliers: SupplierData[];
  users: ReturnType<User["toJSON"]>[];
  sales: SaleJSON[];
  serviceOrders: ServiceOrderJSON[];
  stockMovements: StockMovementJSON[];
}

const KEY_DATA = "denka-db";
const DATA_VERSION = 1;

/**
 * Database — Singleton yang menampung seluruh repository (simulasi database).
 * Semua controller mengambil data lewat satu instance ini sehingga
 * modul POS, stock, service, dan laporan berbagi data yang sama.
 *
 * Persistensi: seluruh isi repository otomatis disimpan ke localStorage
 * setiap ada perubahan, dan dimuat kembali saat aplikasi dibuka.
 */
export class Database {
  private static instance: Database | null = null;

  readonly products = new ProductRepository();
  readonly suppliers = new SupplierRepository();
  readonly users = new UserRepository();
  readonly sales = new SaleRepository();
  readonly services = new ServiceRepository();
  readonly stockMovements = new StockMovementRepository();

  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  private constructor() {
    const stored = LocalStore.load<DatabaseSnapshot>(KEY_DATA);
    if (stored && stored.version === DATA_VERSION) {
      this.hydrate(stored);
    } else {
      this.seedAll();
    }
    this.setupAutoSave();
  }

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  private get allRepositories() {
    return [this.products, this.suppliers, this.users, this.sales, this.services, this.stockMovements];
  }

  // ---------- persistensi ----------

  /** Muat kembali seluruh entity dari snapshot JSON (revive tanggal & subclass). */
  private hydrate(data: DatabaseSnapshot): void {
    this.products.seed(data.products.map(Product.fromJSON));
    this.suppliers.seed(data.suppliers.map(Supplier.fromJSON));
    this.users.seed(data.users.map(User.fromJSON));
    this.sales.seed(data.sales.map(Sale.fromJSON));
    this.services.seed(data.serviceOrders.map(ServiceOrder.fromJSON));
    this.stockMovements.seed(data.stockMovements.map(stockMovementFromJSON));
  }

  private snapshot(): DatabaseSnapshot {
    return {
      version: DATA_VERSION,
      products: this.products.findAll().map((row) => row.toJSON()),
      suppliers: this.suppliers.findAll().map((row) => row.toJSON()),
      users: this.users.findAll().map((row) => row.toJSON()),
      sales: this.sales.findAll().map((row) => row.toJSON()),
      serviceOrders: this.services.findAll().map((row) => row.toJSON()),
      stockMovements: this.stockMovements.findAll().map(stockMovementToJSON),
    };
  }

  /** Simpan otomatis (debounce) setiap ada perubahan di repository mana pun. */
  private setupAutoSave(): void {
    if (!LocalStore.available) return;
    const schedule = () => {
      if (this.saveTimer) clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(() => {
        LocalStore.save(KEY_DATA, this.snapshot());
      }, 250);
    };
    this.allRepositories.forEach((repo) => repo.subscribe(schedule));
  }

  /** Snapshot seluruh data — dipakai modul sinkronisasi untuk backup ke cloud. */
  takeSnapshot(): DatabaseSnapshot {
    return this.snapshot();
  }

  /** Ganti seluruh isi database dari snapshot — dipakai saat restore dari cloud. */
  replaceAll(data: DatabaseSnapshot): void {
    this.hydrate(data);
    this.allRepositories.forEach((repo) => repo.touch());
  }

  /** Daftarkan callback yang dipanggil setiap ada perubahan di repository mana pun. */
  onChange(listener: () => void): void {
    this.allRepositories.forEach((repo) => repo.subscribe(listener));
  }

  /** Kembalikan seluruh data ke kondisi awal (seed) dan hapus penyimpanan. */
  resetToInitialSeed(): void {
    LocalStore.remove(KEY_DATA);
    this.seedAll();
    this.allRepositories.forEach((repo) => repo.touch());
  }

  private seedAll(): void {
    this.seedSuppliers();
    this.seedProducts();
    this.seedUsers();
    this.seedSales();
    this.seedServices();
    this.seedStockMovements();
  }

  // ---------- seed data awal ----------

  private seedSuppliers(): void {
    this.suppliers.seed([
      new Supplier({
        id: "sup1", name: "PT Sumber Komputer", contactPerson: "Hendra Gunawan",
        phone: "081234500011", address: "Jl. Mangga Dua Raya No. 12, Jakarta Pusat",
        notes: "Supplier utama laptop & SSD, pembayaran tempo 14 hari.",
        suppliedItems: ["Laptop ASUS Vivobook 14", "Macbook Air M1", "SSD NVMe 512GB", "PC Rakitan Gaming"],
      }),
      new Supplier({
        id: "sup2", name: "CV Elektronik Jaya", contactPerson: "Lisa Permata",
        phone: "082199900022", address: "Jl. Kenari No. 45, Bandung",
        suppliedItems: ["Laptop Lenovo IdeaPad 3", "Headset Gaming", "Tas Laptop 14\""],
      }),
      new Supplier({
        id: "sup3", name: "Toko Grosir IT", contactPerson: "Budi Santoso",
        phone: "081333300033", address: "Ruko ITC Lt. 2 Blok C, Surabaya",
        notes: "Harga grosir aksesoris paling kompetitif.",
        suppliedItems: ["Mouse Wireless Logitech", "Keyboard Mechanical RGB", "Power Supply 500W", "Thermal Paste"],
      }),
      new Supplier({
        id: "sup4", name: "PT Maju Teknologi", contactPerson: "Rina Astuti",
        phone: "085700000044", address: "Jl. Gajah Mada No. 8, Semarang",
        suppliedItems: ["Laptop Acer Aspire 5", "RAM DDR4 8GB", "Cooling Pad"],
      }),
    ]);
  }

  private seedProducts(): void {
    this.products.seed([
      new Product({ id: "i1", code: "LP-001", name: "Laptop ASUS Vivobook 14", category: "laptop", purchasePrice: 6200000, sellPrice: 7000000, stock: 5, minStock: 3, supplier: "PT Sumber Komputer", specification: "Ryzen 5 / 8GB / 512GB SSD" }),
      new Product({ id: "i2", code: "LP-002", name: "Laptop Acer Aspire 5", category: "laptop", purchasePrice: 7600000, sellPrice: 8500000, stock: 3, minStock: 3, supplier: "PT Maju Teknologi", specification: "Core i5 / 8GB / 512GB SSD" }),
      new Product({ id: "i3", code: "LP-003", name: "Macbook Air M1", category: "laptop", purchasePrice: 13000000, sellPrice: 14500000, stock: 2, minStock: 3, supplier: "PT Sumber Komputer", specification: "Apple M1 / 8GB / 256GB" }),
      new Product({ id: "i4", code: "LP-004", name: "Laptop Lenovo IdeaPad 3", category: "laptop", purchasePrice: 5500000, sellPrice: 6200000, stock: 0, minStock: 2, supplier: "CV Elektronik Jaya", specification: "Core i3 / 8GB / 256GB SSD" }),
      new Product({ id: "i5", code: "PC-001", name: "PC Rakitan Gaming", category: "pc", purchasePrice: 11000000, sellPrice: 12500000, stock: 2, minStock: 2, supplier: "PT Sumber Komputer", specification: "Ryzen 5 5600 / RTX 3060 / 16GB" }),
      new Product({ id: "i15", code: "PC-002", name: "Motherboard B550M", category: "pc", purchasePrice: 1500000, sellPrice: 1750000, stock: 5, minStock: 2, supplier: "PT Sumber Komputer", specification: "AM4 / DDR4 / mATX" }),
      new Product({ id: "i16", code: "PC-003", name: "Processor Ryzen 5 5600", category: "pc", purchasePrice: 1650000, sellPrice: 1900000, stock: 6, minStock: 2, supplier: "PT Maju Teknologi", specification: "6 Core / 12 Thread / AM4" }),
      new Product({ id: "i6", code: "SP-001", name: "SSD NVMe 512GB", category: "sparepart", purchasePrice: 720000, sellPrice: 900000, stock: 3, minStock: 5, supplier: "PT Sumber Komputer", specification: "PCIe Gen3 / 2400MB/s" }),
      new Product({ id: "i7", code: "SP-002", name: "RAM DDR4 8GB", category: "sparepart", purchasePrice: 350000, sellPrice: 450000, stock: 9, minStock: 5, supplier: "PT Maju Teknologi", specification: "3200MHz / SODIMM" }),
      new Product({ id: "i8", code: "AC-001", name: "Mouse Wireless Logitech", category: "aksesoris", purchasePrice: 110000, sellPrice: 150000, stock: 24, minStock: 5, supplier: "Toko Grosir IT", specification: "2.4GHz / 1000 DPI" }),
      new Product({ id: "i9", code: "AC-002", name: "Keyboard Mechanical RGB", category: "aksesoris", purchasePrice: 350000, sellPrice: 450000, stock: 12, minStock: 4, supplier: "Toko Grosir IT", specification: "Blue Switch / TKL" }),
      new Product({ id: "i10", code: "AC-003", name: "Headset Gaming", category: "aksesoris", purchasePrice: 240000, sellPrice: 320000, stock: 0, minStock: 4, supplier: "CV Elektronik Jaya", specification: "7.1 Surround / USB" }),
      new Product({ id: "i11", code: "SP-003", name: "Power Supply 500W", category: "sparepart", purchasePrice: 430000, sellPrice: 550000, stock: 6, minStock: 3, supplier: "Toko Grosir IT", specification: "80+ Bronze / Non-modular" }),
      new Product({ id: "i12", code: "LN-001", name: "Thermal Paste", category: "lainnya", purchasePrice: 30000, sellPrice: 45000, stock: 30, minStock: 10, supplier: "Toko Grosir IT", specification: "Tube 4g / 8.5 W/mK" }),
      new Product({ id: "i13", code: "LN-002", name: "Tas Laptop 14\"", category: "lainnya", purchasePrice: 85000, sellPrice: 120000, stock: 15, minStock: 5, supplier: "CV Elektronik Jaya", specification: "Waterproof / Slot 14 inch" }),
      new Product({ id: "i14", code: "LN-003", name: "Cooling Pad", category: "lainnya", purchasePrice: 130000, sellPrice: 175000, stock: 9, minStock: 4, supplier: "PT Maju Teknologi", specification: "5 Fan / RGB / 17 inch" }),
    ]);
  }

  private seedUsers(): void {
    this.users.seed([
      new User({ id: "u1", name: "Budi Denka", username: "budi", email: "budi@denkacomputer.id", password: "denka123", role: "pemilik", active: true, lastLogin: daysAgo(0, 8, 15) }),
      new User({ id: "u2", name: "Sari Admin", username: "sari", email: "sari@denkacomputer.id", password: "sari123", role: "admin", active: true, lastLogin: daysAgo(0, 9, 2) }),
      new User({ id: "u3", name: "Rizki Teknisi", username: "rizki", email: "rizki@denkacomputer.id", password: "rizki123", role: "admin", active: true, lastLogin: daysAgo(1, 16, 40) }),
      new User({ id: "u4", name: "Agus Pratama", username: "agus", email: "agus@denkacomputer.id", password: "agus123", role: "admin", active: false, lastLogin: daysAgo(8, 11, 25) }),
    ]);
  }

  private seedSales(): void {
    // helper: buat SaleItem dari code barang yang sudah di-seed
    const detail = (code: string, quantity: number): SaleItem => {
      const product = this.products.findByCode(code);
      if (!product) throw new Error(`Seed transaksi: barang ${code} tidak ditemukan.`);
      return new SaleItem(product.id, product.name, product.sellPrice, product.purchasePrice, quantity);
    };

    type SeedSale = {
      day: number; hour: number; cashier: string;
      method: PaymentMethod; items: [string, number][]; discount?: number;
    };

    const list: SeedSale[] = [
      // hari ini & minggu berjalan
      { day: 0, hour: 9, cashier: "Sari Admin", method: "tunai", items: [["AC-001", 2], ["LN-001", 3]] },
      { day: 0, hour: 11, cashier: "Budi Denka", method: "transfer", items: [["LP-001", 1]] },
      { day: 0, hour: 14, cashier: "Sari Admin", method: "qris", items: [["SP-002", 2], ["AC-002", 1]] },
      { day: 1, hour: 10, cashier: "Sari Admin", method: "tunai", items: [["SP-001", 2], ["LN-001", 2]] },
      { day: 1, hour: 15, cashier: "Budi Denka", method: "qris", items: [["LN-003", 1], ["AC-001", 3]] },
      { day: 2, hour: 11, cashier: "Sari Admin", method: "transfer", items: [["LP-002", 1], ["LN-002", 1]] },
      { day: 3, hour: 13, cashier: "Sari Admin", method: "tunai", items: [["AC-002", 2], ["SP-003", 1]] },
      { day: 4, hour: 10, cashier: "Budi Denka", method: "tunai", items: [["SP-002", 3]], discount: 50000 },
      { day: 5, hour: 16, cashier: "Sari Admin", method: "qris", items: [["LP-001", 1], ["AC-001", 1], ["LN-002", 1]] },
      { day: 6, hour: 12, cashier: "Sari Admin", method: "tunai", items: [["LN-001", 5], ["AC-001", 2]] },
      // minggu-minggu sebelumnya (untuk laporan tren & keuntungan)
      { day: 9, hour: 11, cashier: "Budi Denka", method: "transfer", items: [["PC-001", 1]] },
      { day: 11, hour: 14, cashier: "Sari Admin", method: "tunai", items: [["SP-001", 3], ["SP-002", 2]] },
      { day: 13, hour: 10, cashier: "Sari Admin", method: "qris", items: [["AC-002", 3], ["LN-003", 2]] },
      { day: 16, hour: 15, cashier: "Budi Denka", method: "transfer", items: [["LP-003", 1]] },
      { day: 18, hour: 11, cashier: "Sari Admin", method: "tunai", items: [["AC-001", 4], ["LN-001", 4]] },
      { day: 20, hour: 13, cashier: "Sari Admin", method: "tunai", items: [["SP-003", 2], ["PC-002", 1]] },
      { day: 23, hour: 10, cashier: "Budi Denka", method: "qris", items: [["LP-001", 1], ["SP-002", 1]] },
      { day: 25, hour: 16, cashier: "Sari Admin", method: "transfer", items: [["PC-003", 2]] },
      { day: 27, hour: 12, cashier: "Sari Admin", method: "tunai", items: [["AC-001", 5], ["LN-002", 2]] },
    ];

    let num = 1023;
    const sales = list
      .slice()
      .reverse()
      .map(
        (seed, index) =>
          new Sale({
            id: "trx-seed-" + index,
            number: "TRX-" + num++,
            date: daysAgo(seed.day, seed.hour),
            cashier: seed.cashier,
            items: seed.items.map(([code, quantity]) => detail(code, quantity)),
            discountType: "rp",
            discountValue: seed.discount ?? 0,
            method: seed.method,
            amountPaid: 0,
          }),
      )
      .reverse(); // terbaru di depan

    this.sales.seed(sales);
  }

  private seedServices(): void {
    const history = (steps: [ServiceStatus, number, number][]): StatusLog[] =>
      steps.map(([status, day, hour]) => new StatusLog(status, daysAgo(day, hour)));

    this.services.seed([
      new ServiceOrder({
        id: "s6", number: "#SRV-0043", customer: "Citra Dewanti", phone: "081255566677",
        unitType: "Laptop", brand: "Lenovo IdeaPad", model: "Slim 3",
        accessories: ["Charger / Adaptor"], complaint: "Keyboard beberapa tombol tidak berfungsi.",
        technician: "Agus Pratama", priority: "normal", status: "diperiksa", receivedAt: daysAgo(0, 8),
        history: history([["antri", 0, 8], ["diperiksa", 0, 10]]),
      }),
      new ServiceOrder({
        id: "s1", number: "#SRV-0042", customer: "Andi Saputra", phone: "081234567890",
        unitType: "Laptop", brand: "ASUS Vivobook", model: "X415", serialNo: "ASX-552310",
        accessories: ["Charger / Adaptor"],
        complaint: "Laptop mati total, tidak ada respon saat tombol power ditekan.",
        technician: "Rizki Teknisi", priority: "urgent", status: "dikerjakan",
        receivedAt: daysAgo(1, 9), serviceFee: 250000,
        history: history([["antri", 1, 9], ["diperiksa", 1, 11], ["dikerjakan", 1, 14]]),
      }),
      new ServiceOrder({
        id: "s2", number: "#SRV-0041", customer: "Rina Wijaya", phone: "082199887766",
        unitType: "PC", brand: "Rakitan", complaint: "PC sering restart sendiri saat main game.",
        technician: "Budi Denka", priority: "normal", status: "antri", receivedAt: daysAgo(0, 10),
        history: history([["antri", 0, 10]]),
      }),
      new ServiceOrder({
        id: "s3", number: "#SRV-0040", customer: "Toko Maju Jaya", phone: "081311112222",
        unitType: "Printer", brand: "Epson", model: "L3210",
        accessories: ["Kabel Data"], complaint: "Hasil cetak bergaris dan warna pudar.",
        diagnosis: "Head printer kotor, sudah dilakukan cleaning.",
        technician: "Agus Pratama", priority: "normal", status: "selesai",
        receivedAt: daysAgo(3, 9), serviceFee: 150000,
        history: history([["antri", 3, 9], ["diperiksa", 3, 11], ["dikerjakan", 3, 13], ["selesai", 2, 11]]),
      }),
      new ServiceOrder({
        id: "s4", number: "#SRV-0039", customer: "Dewi Lestari", phone: "085700001111",
        unitType: "Laptop", brand: "HP Pavilion", model: "14-dv",
        accessories: ["Charger / Adaptor", "Tas Laptop"], complaint: "Layar pecah perlu ganti LCD.",
        diagnosis: "LCD retak, menunggu sparepart LCD 14 inch.",
        technician: "Rizki Teknisi", priority: "urgent", status: "sparepart",
        receivedAt: daysAgo(2, 9), serviceFee: 300000,
        history: history([["antri", 2, 9], ["diperiksa", 2, 13], ["dikerjakan", 2, 15], ["sparepart", 1, 10]]),
      }),
      new ServiceOrder({
        id: "s5", number: "#SRV-0038", customer: "Bayu Pratama", phone: "081888899900",
        unitType: "Laptop", brand: "Apple Macbook", model: "Air M1",
        accessories: ["Charger / Adaptor"], complaint: "Upgrade penyimpanan dan bersih-bersih sistem.",
        diagnosis: "Upgrade SSD selesai, performa normal.",
        technician: "Budi Denka", priority: "normal", status: "diambil",
        receivedAt: daysAgo(5, 9), serviceFee: 200000,
        history: history([["antri", 5, 9], ["dikerjakan", 5, 13], ["selesai", 4, 10], ["diambil", 3, 16]]),
      }),
    ]);

    // sparepart terpakai pada service Bayu Pratama
    const service = this.services.findById("s5");
    const ssd = this.products.findById("i6");
    if (service && ssd) {
      service.addPart(ssd.id, ssd.name, 1, ssd.sellPrice);
    }
  }

  private seedStockMovements(): void {
    this.stockMovements.seed([
      new StockOut({ id: "out1", date: daysAgo(1, 9), productName: "Keyboard Mechanical RGB", quantity: 1, reason: "rusak", note: "Switch tidak berfungsi, klaim garansi", recordedBy: "Sari Admin" }),
      new StockIn({ id: "in1", date: daysAgo(1, 8), productName: "SSD NVMe 512GB", supplier: "PT Sumber Komputer", quantity: 10, unitPrice: 720000, invoiceNo: "FK-2026-0451", recordedBy: "Budi Denka" }),
      new StockOut({ id: "out2", date: daysAgo(2, 10), productName: "Power Supply 500W", quantity: 2, reason: "retur", note: "Unit cacat produksi, dikembalikan ke supplier", recordedBy: "Budi Denka" }),
      new StockIn({ id: "in2", date: daysAgo(2, 9), productName: "RAM DDR4 8GB", supplier: "PT Maju Teknologi", quantity: 15, unitPrice: 350000, invoiceNo: "FK-2026-0448", recordedBy: "Sari Admin" }),
      new StockIn({ id: "in3", date: daysAgo(3, 11), productName: "Laptop ASUS Vivobook 14", supplier: "PT Sumber Komputer", quantity: 3, unitPrice: 6200000, invoiceNo: "FK-2026-0440", recordedBy: "Budi Denka" }),
      new StockOut({ id: "out3", date: daysAgo(4, 14), productName: "SSD NVMe 512GB", quantity: 1, reason: "internal", note: "Dipakai untuk PC kasir toko", recordedBy: "Budi Denka" }),
      new StockIn({ id: "in4", date: daysAgo(5, 10), productName: "Mouse Wireless Logitech", supplier: "Toko Grosir IT", quantity: 30, unitPrice: 110000, recordedBy: "Sari Admin" }),
    ]);
  }
}
