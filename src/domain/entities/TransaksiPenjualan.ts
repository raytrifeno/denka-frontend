import { Entity } from "../core/Entity";

export type MetodePembayaran = "tunai" | "transfer" | "qris";
export type TipeDiskon = "rp" | "percent";

export const LABEL_METODE: Record<MetodePembayaran, string> = {
  tunai: "Tunai",
  transfer: "Transfer Bank",
  qris: "QRIS",
};

/**
 * DetailTransaksi — satu baris barang pada sebuah transaksi.
 * Menyimpan snapshot nama & harga saat penjualan terjadi, sehingga laporan
 * tetap benar walaupun harga barang berubah di kemudian hari.
 */
export class DetailTransaksi {
  constructor(
    readonly barangId: string,
    readonly namaBarang: string,
    readonly hargaSatuan: number,
    readonly hargaBeliSatuan: number,
    readonly jumlah: number,
  ) {}

  subtotal(): number {
    return this.hargaSatuan * this.jumlah;
  }

  /** Keuntungan kotor baris ini (dipakai laporan keuntungan). */
  keuntungan(): number {
    return (this.hargaSatuan - this.hargaBeliSatuan) * this.jumlah;
  }
}

export interface DataTransaksi {
  id: string;
  nomor: string;
  tanggal: Date;
  kasir: string;
  items: DetailTransaksi[];
  tipeDiskon: TipeDiskon;
  nilaiDiskon: number;
  metode: MetodePembayaran;
  uangDiterima: number;
  whatsappPelanggan?: string;
}

/** Entity class TransaksiPenjualan — satu nota penjualan (POS). */
export class TransaksiPenjualan extends Entity {
  private _nomor: string;
  private _tanggal: Date;
  private _kasir: string;
  private _items: DetailTransaksi[];
  private _tipeDiskon: TipeDiskon;
  private _nilaiDiskon: number;
  private _metode: MetodePembayaran;
  private _uangDiterima: number;
  private _whatsappPelanggan?: string;

  constructor(data: DataTransaksi) {
    super(data.id);
    this._nomor = data.nomor;
    this._tanggal = data.tanggal;
    this._kasir = data.kasir;
    this._items = [...data.items];
    this._tipeDiskon = data.tipeDiskon;
    this._nilaiDiskon = Math.max(0, data.nilaiDiskon);
    this._metode = data.metode;
    this._uangDiterima = Math.max(0, data.uangDiterima);
    this._whatsappPelanggan = data.whatsappPelanggan;
  }

  get nomor(): string { return this._nomor; }
  get tanggal(): Date { return this._tanggal; }
  get kasir(): string { return this._kasir; }
  get items(): DetailTransaksi[] { return [...this._items]; }
  get tipeDiskon(): TipeDiskon { return this._tipeDiskon; }
  get nilaiDiskon(): number { return this._nilaiDiskon; }
  get metode(): MetodePembayaran { return this._metode; }
  get uangDiterima(): number { return this._uangDiterima; }
  get whatsappPelanggan(): string | undefined { return this._whatsappPelanggan; }

  subtotal(): number {
    return this._items.reduce((total, item) => total + item.subtotal(), 0);
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
    if (this._metode !== "tunai") return 0;
    return Math.max(this._uangDiterima - this.total(), 0);
  }

  jumlahItem(): number {
    return this._items.reduce((total, item) => total + item.jumlah, 0);
  }

  /** Total keuntungan kotor transaksi (omset dikurangi modal, setelah diskon). */
  keuntungan(): number {
    const kotor = this._items.reduce((total, item) => total + item.keuntungan(), 0);
    return kotor - this.diskon();
  }

  /** Serialisasi untuk penyimpanan lokal. */
  toJSON(): TransaksiJSON {
    return {
      id: this.id,
      nomor: this._nomor,
      tanggal: this._tanggal.toISOString(),
      kasir: this._kasir,
      items: this._items.map((item) => ({
        barangId: item.barangId,
        namaBarang: item.namaBarang,
        hargaSatuan: item.hargaSatuan,
        hargaBeliSatuan: item.hargaBeliSatuan,
        jumlah: item.jumlah,
      })),
      tipeDiskon: this._tipeDiskon,
      nilaiDiskon: this._nilaiDiskon,
      metode: this._metode,
      uangDiterima: this._uangDiterima,
      whatsappPelanggan: this._whatsappPelanggan,
    };
  }

  static dariJSON(data: TransaksiJSON): TransaksiPenjualan {
    return new TransaksiPenjualan({
      ...data,
      tanggal: new Date(data.tanggal),
      items: data.items.map(
        (item) =>
          new DetailTransaksi(
            item.barangId,
            item.namaBarang,
            item.hargaSatuan,
            item.hargaBeliSatuan,
            item.jumlah,
          ),
      ),
    });
  }
}

export interface TransaksiJSON {
  id: string;
  nomor: string;
  tanggal: string;
  kasir: string;
  items: {
    barangId: string;
    namaBarang: string;
    hargaSatuan: number;
    hargaBeliSatuan: number;
    jumlah: number;
  }[];
  tipeDiskon: TipeDiskon;
  nilaiDiskon: number;
  metode: MetodePembayaran;
  uangDiterima: number;
  whatsappPelanggan?: string;
}
