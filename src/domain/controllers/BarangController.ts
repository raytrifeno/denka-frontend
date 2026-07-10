import { Observable } from "../core/Observable";
import { buatId } from "../core/Entity";
import { Database } from "../Database";
import { Barang, type KategoriBarang } from "../entities/Barang";
import type { FilterBarang } from "../repositories/BarangRepository";

export interface FormBarang {
  nama: string;
  kode: string;
  kategori: string;
  supplier: string;
  hargaBeli: string;
  hargaJual: string;
  stok: string;
  stokMinimum: string;
  spesifikasi: string;
}

export type ErrorForm = Partial<Record<keyof FormBarang, string>>;

/**
 * BarangController — controller class untuk manajemen katalog barang.
 * Memuat validasi dan aturan bisnis yang sebelumnya tersebar di komponen.
 */
export class BarangController extends Observable {
  private static instance: BarangController | null = null;
  private db = Database.getInstance();

  private constructor() {
    super();
    // teruskan perubahan repository ke boundary yang berlangganan controller ini
    this.db.barang.subscribe(() => this.notify());
    this.db.supplier.subscribe(() => this.notify());
  }

  static getInstance(): BarangController {
    if (!BarangController.instance) {
      BarangController.instance = new BarangController();
    }
    return BarangController.instance;
  }

  daftarBarang(filter: FilterBarang = {}): Barang[] {
    return this.db.barang.cari(filter);
  }

  cariById(id: string): Barang | undefined {
    return this.db.barang.findById(id);
  }

  daftarNamaSupplier(): string[] {
    return this.db.supplier.daftarNama();
  }

  generateKode(kategori: string): string {
    const prefix = (kategori ? kategori.slice(0, 2) : "BR").toUpperCase();
    return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  validasi(form: FormBarang, idEdit?: string): ErrorForm {
    const errors: ErrorForm = {};
    if (!form.nama.trim()) errors.nama = "Nama barang wajib diisi.";
    if (!form.kode.trim()) errors.kode = "Kode/SKU wajib diisi.";
    else {
      const duplikat = this.db.barang.findByKode(form.kode.trim());
      if (duplikat && duplikat.id !== idEdit) errors.kode = "Kode/SKU sudah dipakai barang lain.";
    }
    if (!form.kategori) errors.kategori = "Pilih kategori.";
    if (!form.supplier) errors.supplier = "Pilih supplier.";
    if (!form.hargaBeli) errors.hargaBeli = "Harga beli wajib diisi.";
    if (!form.hargaJual) errors.hargaJual = "Harga jual wajib diisi.";
    else if (form.hargaBeli && Number(form.hargaJual) < Number(form.hargaBeli)) {
      errors.hargaJual = "Harga jual < harga beli.";
    }
    if (form.stok === "") errors.stok = "Stok awal wajib diisi.";
    if (form.stokMinimum === "") errors.stokMinimum = "Stok minimum wajib diisi.";
    return errors;
  }

  /** Simpan barang baru atau perbarui barang lama. */
  simpan(form: FormBarang, idEdit?: string): { sukses: boolean; errors: ErrorForm } {
    const errors = this.validasi(form, idEdit);
    if (Object.keys(errors).length > 0) return { sukses: false, errors };

    const data = {
      kode: form.kode.trim(),
      nama: form.nama.trim(),
      kategori: form.kategori as KategoriBarang,
      hargaBeli: Number(form.hargaBeli),
      hargaJual: Number(form.hargaJual),
      stok: Number(form.stok),
      stokMinimum: Number(form.stokMinimum),
      supplier: form.supplier,
      spesifikasi: form.spesifikasi.trim() || undefined,
    };

    const lama = idEdit ? this.db.barang.findById(idEdit) : undefined;
    if (lama) {
      lama.perbarui(data);
      this.db.barang.touch();
    } else {
      this.db.barang.save(new Barang({ id: buatId("brg"), ...data }));
      this.db.supplier.findByNama(data.supplier)?.tambahBarangDisuplai(data.nama);
    }
    return { sukses: true, errors: {} };
  }

  hapus(id: string): void {
    this.db.barang.delete(id);
  }

  hapusBanyak(ids: string[]): void {
    this.db.barang.deleteMany(ids);
  }

  ubahKategoriBanyak(ids: string[], kategori: KategoriBarang): void {
    ids.forEach((id) => {
      const barang = this.db.barang.findById(id);
      if (barang) barang.kategori = kategori;
    });
    this.db.barang.touch();
  }
}
