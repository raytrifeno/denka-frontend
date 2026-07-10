import { Entity } from "../core/Entity";

export type KategoriBarang = "laptop" | "pc" | "aksesoris" | "sparepart" | "lainnya";
export type StatusStok = "aman" | "menipis" | "habis";

export interface DataBarang {
  id: string;
  kode: string;
  nama: string;
  kategori: KategoriBarang;
  hargaBeli: number;
  hargaJual: number;
  stok: number;
  stokMinimum: number;
  supplier: string;
  spesifikasi?: string;
}

/**
 * Entity class Barang — merepresentasikan satu produk di katalog toko.
 * Atribut bersifat private (enkapsulasi); perubahan stok hanya boleh lewat
 * metode tambahStok/kurangiStok agar aturan bisnis selalu ditegakkan.
 */
export class Barang extends Entity {
  private _kode: string;
  private _nama: string;
  private _kategori: KategoriBarang;
  private _hargaBeli: number;
  private _hargaJual: number;
  private _stok: number;
  private _stokMinimum: number;
  private _supplier: string;
  private _spesifikasi?: string;

  constructor(data: DataBarang) {
    super(data.id);
    this._kode = data.kode;
    this._nama = data.nama;
    this._kategori = data.kategori;
    this._hargaBeli = data.hargaBeli;
    this._hargaJual = data.hargaJual;
    this._stok = Math.max(0, data.stok);
    this._stokMinimum = Math.max(0, data.stokMinimum);
    this._supplier = data.supplier;
    this._spesifikasi = data.spesifikasi;
  }

  // ----- getter -----
  get kode(): string { return this._kode; }
  get nama(): string { return this._nama; }
  get kategori(): KategoriBarang { return this._kategori; }
  get hargaBeli(): number { return this._hargaBeli; }
  get hargaJual(): number { return this._hargaJual; }
  get stok(): number { return this._stok; }
  get stokMinimum(): number { return this._stokMinimum; }
  get supplier(): string { return this._supplier; }
  get spesifikasi(): string | undefined { return this._spesifikasi; }

  set kategori(kategori: KategoriBarang) { this._kategori = kategori; }

  // ----- metode domain -----
  statusStok(): StatusStok {
    if (this._stok === 0) return "habis";
    if (this._stok <= this._stokMinimum) return "menipis";
    return "aman";
  }

  /** Keuntungan kotor per unit. */
  margin(): number {
    return this._hargaJual - this._hargaBeli;
  }

  stokCukup(jumlah: number): boolean {
    return this._stok >= jumlah;
  }

  tambahStok(jumlah: number): void {
    if (jumlah <= 0) throw new Error("Jumlah stok masuk harus lebih dari 0.");
    this._stok += jumlah;
  }

  kurangiStok(jumlah: number): void {
    if (jumlah <= 0) throw new Error("Jumlah stok keluar harus lebih dari 0.");
    if (!this.stokCukup(jumlah)) {
      throw new Error(`Stok ${this._nama} tidak mencukupi (tersedia ${this._stok}).`);
    }
    this._stok -= jumlah;
  }

  /** Serialisasi untuk penyimpanan lokal. */
  toJSON(): DataBarang {
    return {
      id: this.id,
      kode: this._kode,
      nama: this._nama,
      kategori: this._kategori,
      hargaBeli: this._hargaBeli,
      hargaJual: this._hargaJual,
      stok: this._stok,
      stokMinimum: this._stokMinimum,
      supplier: this._supplier,
      spesifikasi: this._spesifikasi,
    };
  }

  static dariJSON(data: DataBarang): Barang {
    return new Barang(data);
  }

  /** Perbarui data dari form edit (dipanggil oleh BarangController). */
  perbarui(data: Omit<DataBarang, "id">): void {
    this._kode = data.kode;
    this._nama = data.nama;
    this._kategori = data.kategori;
    this._hargaBeli = data.hargaBeli;
    this._hargaJual = data.hargaJual;
    this._stok = Math.max(0, data.stok);
    this._stokMinimum = Math.max(0, data.stokMinimum);
    this._supplier = data.supplier;
    this._spesifikasi = data.spesifikasi;
  }
}
