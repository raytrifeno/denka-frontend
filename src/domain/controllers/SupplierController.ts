import { Observable } from "../core/Observable";
import { buatId } from "../core/Entity";
import { Database } from "../Database";
import { Supplier } from "../entities/Supplier";

export interface FormSupplier {
  nama: string;
  kontakPerson: string;
  telepon: string;
  alamat: string;
  catatan: string;
}

export type ErrorSupplier = Record<string, string>;

/** SupplierController — controller class untuk data pemasok. */
export class SupplierController extends Observable {
  private static instance: SupplierController | null = null;
  private db = Database.getInstance();

  private constructor() {
    super();
    this.db.supplier.subscribe(() => this.notify());
  }

  static getInstance(): SupplierController {
    if (!SupplierController.instance) {
      SupplierController.instance = new SupplierController();
    }
    return SupplierController.instance;
  }

  daftar(kataKunci = ""): Supplier[] {
    return this.db.supplier.cari(kataKunci);
  }

  validasi(form: FormSupplier): ErrorSupplier {
    const errors: ErrorSupplier = {};
    if (!form.nama.trim()) errors.nama = "Nama supplier wajib diisi.";
    if (!form.kontakPerson.trim()) errors.kontakPerson = "Kontak person wajib diisi.";
    if (!form.telepon.trim()) errors.telepon = "Nomor telepon wajib diisi.";
    if (!form.alamat.trim()) errors.alamat = "Alamat wajib diisi.";
    return errors;
  }

  simpan(form: FormSupplier, idEdit?: string): { sukses: boolean; errors: ErrorSupplier } {
    const errors = this.validasi(form);
    if (Object.keys(errors).length > 0) return { sukses: false, errors };

    const data = {
      nama: form.nama.trim(),
      kontakPerson: form.kontakPerson.trim(),
      telepon: form.telepon.trim(),
      alamat: form.alamat.trim(),
      catatan: form.catatan.trim() || undefined,
    };

    const lama = idEdit ? this.db.supplier.findById(idEdit) : undefined;
    if (lama) {
      lama.perbarui(data);
      this.db.supplier.touch();
    } else {
      this.db.supplier.save(new Supplier({ id: buatId("sup"), ...data }));
    }
    return { sukses: true, errors: {} };
  }

  hapus(id: string): void {
    this.db.supplier.delete(id);
  }
}
