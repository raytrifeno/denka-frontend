import { Observable } from "../core/Observable";
import { buatId } from "../core/Entity";
import { Database } from "../Database";
import { AuthController } from "./AuthController";
import type { Barang, KategoriBarang } from "../entities/Barang";
import {
  DetailTransaksi,
  TransaksiPenjualan,
  type MetodePembayaran,
  type TipeDiskon,
} from "../entities/TransaksiPenjualan";

export class ItemKeranjang {
  constructor(
    readonly barang: Barang,
    private _jumlah: number,
  ) {}

  get jumlah(): number { return this._jumlah; }

  subtotal(): number {
    return this.barang.hargaJual * this._jumlah;
  }

  /** Ubah jumlah dengan batas 1..stok barang. */
  ubahJumlah(delta: number): boolean {
    const baru = this._jumlah + delta;
    if (baru <= 0 || baru > this.barang.stok) return false;
    this._jumlah = baru;
    return true;
  }
}

/**
 * TransaksiController — controller class untuk Point of Sale.
 * Menyimpan state keranjang & pembayaran, menghitung total, dan saat
 * pembayaran diproses: membuat entity TransaksiPenjualan sekaligus
 * mengurangi stok entity Barang (menghubungkan dua entity).
 */
export class TransaksiController extends Observable {
  private static instance: TransaksiController | null = null;
  private db = Database.getInstance();
  private auth = AuthController.getInstance();

  private _keranjang: ItemKeranjang[] = [];
  private _tipeDiskon: TipeDiskon = "rp";
  private _nilaiDiskon = 0;
  private _metode: MetodePembayaran = "tunai";
  private _uangDiterima = 0;
  private _whatsapp = "";
  private _transaksiTerakhir: TransaksiPenjualan | null = null;

  private constructor() {
    super();
    this.db.barang.subscribe(() => this.notify());
  }

  static getInstance(): TransaksiController {
    if (!TransaksiController.instance) {
      TransaksiController.instance = new TransaksiController();
    }
    return TransaksiController.instance;
  }

  // ----- katalog -----
  katalog(kataKunci: string, kategori: KategoriBarang | "all"): Barang[] {
    return this.db.barang.cari({ kataKunci, kategori });
  }

  // ----- keranjang -----
  get keranjang(): ItemKeranjang[] { return [...this._keranjang]; }
  get tipeDiskon(): TipeDiskon { return this._tipeDiskon; }
  get nilaiDiskon(): number { return this._nilaiDiskon; }
  get metode(): MetodePembayaran { return this._metode; }
  get uangDiterima(): number { return this._uangDiterima; }
  get whatsapp(): string { return this._whatsapp; }
  get transaksiTerakhir(): TransaksiPenjualan | null { return this._transaksiTerakhir; }

  tambahKeKeranjang(barangId: string): void {
    const barang = this.db.barang.findById(barangId);
    if (!barang || barang.stok === 0) return;
    const item = this._keranjang.find((isi) => isi.barang.id === barangId);
    if (item) {
      if (!item.ubahJumlah(1)) return;
    } else {
      this._keranjang.push(new ItemKeranjang(barang, 1));
    }
    this.notify();
  }

  ubahJumlah(barangId: string, delta: number): void {
    const item = this._keranjang.find((isi) => isi.barang.id === barangId);
    if (!item) return;
    if (item.jumlah + delta <= 0) {
      this.hapusDariKeranjang(barangId);
      return;
    }
    if (item.ubahJumlah(delta)) this.notify();
  }

  hapusDariKeranjang(barangId: string): void {
    this._keranjang = this._keranjang.filter((isi) => isi.barang.id !== barangId);
    this.notify();
  }

  setDiskon(tipe: TipeDiskon, nilai: number): void {
    this._tipeDiskon = tipe;
    this._nilaiDiskon = Math.max(0, nilai);
    this.notify();
  }

  setMetode(metode: MetodePembayaran): void {
    this._metode = metode;
    this.notify();
  }

  setUangDiterima(nilai: number): void {
    this._uangDiterima = Math.max(0, nilai);
    this.notify();
  }

  setWhatsapp(nomor: string): void {
    this._whatsapp = nomor;
    this.notify();
  }

  // ----- perhitungan -----
  subtotal(): number {
    return this._keranjang.reduce((total, item) => total + item.subtotal(), 0);
  }

  diskon(): number {
    const subtotal = this.subtotal();
    if (this._tipeDiskon === "percent") {
      return Math.round((subtotal * Math.min(this._nilaiDiskon, 100)) / 100);
    }
    return Math.min(this._nilaiDiskon, subtotal);
  }

  total(): number {
    return Math.max(this.subtotal() - this.diskon(), 0);
  }

  kembalian(): number {
    return Math.max(this._uangDiterima - this.total(), 0);
  }

  jumlahItem(): number {
    return this._keranjang.reduce((total, item) => total + item.jumlah, 0);
  }

  bisaBayar(): boolean {
    if (this._keranjang.length === 0) return false;
    if (this._metode === "tunai") return this._uangDiterima >= this.total();
    return true;
  }

  // ----- proses bisnis utama -----
  /**
   * Proses pembayaran: validasi stok, buat TransaksiPenjualan,
   * kurangi stok Barang, lalu simpan ke repository.
   */
  prosesPembayaran(): { sukses: boolean; pesan?: string } {
    if (!this.bisaBayar()) {
      return { sukses: false, pesan: "Keranjang kosong atau pembayaran belum cukup." };
    }
    for (const item of this._keranjang) {
      if (!item.barang.stokCukup(item.jumlah)) {
        return { sukses: false, pesan: `Stok ${item.barang.nama} tidak mencukupi.` };
      }
    }

    const transaksi = new TransaksiPenjualan({
      id: buatId("trx"),
      nomor: this.db.transaksi.nomorBerikutnya(),
      tanggal: new Date(),
      kasir: this.auth.namaPenggunaAktif,
      items: this._keranjang.map(
        (item) =>
          new DetailTransaksi(
            item.barang.id,
            item.barang.nama,
            item.barang.hargaJual,
            item.barang.hargaBeli,
            item.jumlah,
          ),
      ),
      tipeDiskon: this._tipeDiskon,
      nilaiDiskon: this._nilaiDiskon,
      metode: this._metode,
      uangDiterima: this._uangDiterima,
      whatsappPelanggan: this._whatsapp.trim() || undefined,
    });

    this._keranjang.forEach((item) => item.barang.kurangiStok(item.jumlah));
    this.db.transaksi.save(transaksi);
    this.db.barang.touch();

    this._transaksiTerakhir = transaksi;
    this.notify();
    return { sukses: true };
  }

  /** Bersihkan keranjang & mulai transaksi baru (setelah struk ditutup). */
  transaksiBaru(): void {
    this._keranjang = [];
    this._tipeDiskon = "rp";
    this._nilaiDiskon = 0;
    this._metode = "tunai";
    this._uangDiterima = 0;
    this._whatsapp = "";
    this._transaksiTerakhir = null;
    this.notify();
  }
}
