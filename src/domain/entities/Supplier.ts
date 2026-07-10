import { Entity } from "../core/Entity";

export interface DataSupplier {
  id: string;
  nama: string;
  kontakPerson: string;
  telepon: string;
  alamat: string;
  catatan?: string;
  barangDisuplai?: string[];
}

/** Entity class Supplier — pemasok barang toko. */
export class Supplier extends Entity {
  private _nama: string;
  private _kontakPerson: string;
  private _telepon: string;
  private _alamat: string;
  private _catatan?: string;
  private _barangDisuplai: string[];

  constructor(data: DataSupplier) {
    super(data.id);
    this._nama = data.nama;
    this._kontakPerson = data.kontakPerson;
    this._telepon = data.telepon;
    this._alamat = data.alamat;
    this._catatan = data.catatan;
    this._barangDisuplai = data.barangDisuplai ?? [];
  }

  get nama(): string { return this._nama; }
  get kontakPerson(): string { return this._kontakPerson; }
  get telepon(): string { return this._telepon; }
  get alamat(): string { return this._alamat; }
  get catatan(): string | undefined { return this._catatan; }
  get barangDisuplai(): string[] { return [...this._barangDisuplai]; }

  jumlahBarang(): number {
    return this._barangDisuplai.length;
  }

  /** Catat bahwa supplier ini memasok barang tertentu (dipanggil saat barang masuk). */
  tambahBarangDisuplai(namaBarang: string): void {
    if (!this._barangDisuplai.includes(namaBarang)) {
      this._barangDisuplai.push(namaBarang);
    }
  }

  perbarui(data: Omit<DataSupplier, "id" | "barangDisuplai">): void {
    this._nama = data.nama;
    this._kontakPerson = data.kontakPerson;
    this._telepon = data.telepon;
    this._alamat = data.alamat;
    this._catatan = data.catatan;
  }

  /** Serialisasi untuk penyimpanan lokal. */
  toJSON(): DataSupplier {
    return {
      id: this.id,
      nama: this._nama,
      kontakPerson: this._kontakPerson,
      telepon: this._telepon,
      alamat: this._alamat,
      catatan: this._catatan,
      barangDisuplai: [...this._barangDisuplai],
    };
  }

  static dariJSON(data: DataSupplier): Supplier {
    return new Supplier(data);
  }

  /** Pencocokan untuk kolom pencarian. */
  cocok(kataKunci: string): boolean {
    const q = kataKunci.trim().toLowerCase();
    if (!q) return true;
    return (
      this._nama.toLowerCase().includes(q) ||
      this._kontakPerson.toLowerCase().includes(q) ||
      this._telepon.includes(q)
    );
  }
}
