import { Observable } from "../core/Observable";
import { buatId } from "../core/Entity";
import { Database } from "../Database";
import { AuthController } from "./AuthController";
import type { Barang } from "../entities/Barang";
import { BarangKeluar, BarangMasuk, type AlasanKeluar } from "../entities/MutasiStok";

export interface FormBarangMasuk {
  namaBarang: string;
  supplier: string;
  jumlah: string;
  hargaSatuan: string;
  tanggal: Date;
  noFaktur: string;
  catatan: string;
}

export interface FormBarangKeluar {
  namaBarang: string;
  jumlah: string;
  alasan: AlasanKeluar | "";
  catatan: string;
}

export type ErrorStok = Record<string, string>;

/**
 * StokController — controller class untuk mutasi stok.
 * Mencatat entity BarangMasuk/BarangKeluar DAN memperbarui stok
 * pada entity Barang secara konsisten.
 */
export class StokController extends Observable {
  private static instance: StokController | null = null;
  private db = Database.getInstance();
  private auth = AuthController.getInstance();

  private constructor() {
    super();
    this.db.mutasiStok.subscribe(() => this.notify());
    this.db.barang.subscribe(() => this.notify());
  }

  static getInstance(): StokController {
    if (!StokController.instance) {
      StokController.instance = new StokController();
    }
    return StokController.instance;
  }

  daftarBarangMasuk(): BarangMasuk[] {
    return this.db.mutasiStok.daftarMasuk();
  }

  daftarBarangKeluar(): BarangKeluar[] {
    return this.db.mutasiStok.daftarKeluar();
  }

  /** Pilihan barang untuk dropdown form. */
  pilihanBarang(): Barang[] {
    return this.db.barang.findAll();
  }

  daftarNamaSupplier(): string[] {
    return this.db.supplier.daftarNama();
  }

  stokTersedia(namaBarang: string): number | null {
    return this.db.barang.findByNama(namaBarang)?.stok ?? null;
  }

  hargaBeliTerakhir(namaBarang: string): number | null {
    return this.db.barang.findByNama(namaBarang)?.hargaBeli ?? null;
  }

  validasiMasuk(form: FormBarangMasuk): ErrorStok {
    const errors: ErrorStok = {};
    if (!form.namaBarang) errors.namaBarang = "Pilih barang.";
    if (!form.supplier) errors.supplier = "Pilih supplier.";
    if (!form.jumlah || Number(form.jumlah) <= 0) errors.jumlah = "Jumlah masuk harus lebih dari 0.";
    if (!form.hargaSatuan) errors.hargaSatuan = "Harga beli satuan wajib diisi.";
    return errors;
  }

  catatBarangMasuk(form: FormBarangMasuk): { sukses: boolean; errors: ErrorStok } {
    const errors = this.validasiMasuk(form);
    if (Object.keys(errors).length > 0) return { sukses: false, errors };

    const barang = this.db.barang.findByNama(form.namaBarang);
    if (!barang) return { sukses: false, errors: { namaBarang: "Barang tidak ditemukan." } };

    barang.tambahStok(Number(form.jumlah));
    this.db.supplier.findByNama(form.supplier)?.tambahBarangDisuplai(barang.nama);
    this.db.mutasiStok.save(
      new BarangMasuk({
        id: buatId("in"),
        tanggal: form.tanggal,
        namaBarang: barang.nama,
        jumlah: Number(form.jumlah),
        supplier: form.supplier,
        hargaSatuan: Number(form.hargaSatuan),
        noFaktur: form.noFaktur.trim() || undefined,
        catatan: form.catatan.trim() || undefined,
        dicatatOleh: this.auth.namaPenggunaAktif,
      }),
    );
    this.db.barang.touch();
    return { sukses: true, errors: {} };
  }

  validasiKeluar(form: FormBarangKeluar): ErrorStok {
    const errors: ErrorStok = {};
    if (!form.namaBarang) errors.namaBarang = "Pilih barang.";
    const tersedia = this.stokTersedia(form.namaBarang);
    if (!form.jumlah || Number(form.jumlah) <= 0) {
      errors.jumlah = "Jumlah keluar harus lebih dari 0.";
    } else if (tersedia !== null && Number(form.jumlah) > tersedia) {
      errors.jumlah = `Jumlah melebihi stok tersedia (${tersedia}).`;
    }
    if (!form.alasan) errors.alasan = "Pilih alasan.";
    return errors;
  }

  catatBarangKeluar(form: FormBarangKeluar): { sukses: boolean; errors: ErrorStok } {
    const errors = this.validasiKeluar(form);
    if (Object.keys(errors).length > 0) return { sukses: false, errors };

    const barang = this.db.barang.findByNama(form.namaBarang);
    if (!barang) return { sukses: false, errors: { namaBarang: "Barang tidak ditemukan." } };

    barang.kurangiStok(Number(form.jumlah));
    this.db.mutasiStok.save(
      new BarangKeluar({
        id: buatId("out"),
        tanggal: new Date(),
        namaBarang: barang.nama,
        jumlah: Number(form.jumlah),
        alasan: form.alasan as AlasanKeluar,
        catatan: form.catatan.trim() || undefined,
        dicatatOleh: this.auth.namaPenggunaAktif,
      }),
    );
    this.db.barang.touch();
    return { sukses: true, errors: {} };
  }
}
