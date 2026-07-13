import { Observable } from "../core/Observable";
import { createId } from "../core/Entity";
import { Database } from "../Database";
import { Supplier } from "../entities/Supplier";

export interface SupplierForm {
  name: string;
  contactPerson: string;
  phone: string;
  address: string;
  notes: string;
}

export type SupplierErrors = Record<string, string>;

/** SupplierController — controller for supplier data. */
export class SupplierController extends Observable {
  private static instance: SupplierController | null = null;
  private db = Database.getInstance();

  private constructor() {
    super();
    this.db.suppliers.subscribe(() => this.notify());
  }

  static getInstance(): SupplierController {
    if (!SupplierController.instance) {
      SupplierController.instance = new SupplierController();
    }
    return SupplierController.instance;
  }

  list(keyword = ""): Supplier[] {
    return this.db.suppliers.search(keyword);
  }

  validate(form: SupplierForm): SupplierErrors {
    const errors: SupplierErrors = {};
    if (!form.name.trim()) errors.name = "Nama supplier wajib diisi.";
    if (!form.contactPerson.trim()) errors.contactPerson = "Kontak person wajib diisi.";
    if (!form.phone.trim()) errors.phone = "Nomor telepon wajib diisi.";
    if (!form.address.trim()) errors.address = "Alamat wajib diisi.";
    return errors;
  }

  save(form: SupplierForm, editId?: string): { success: boolean; errors: SupplierErrors } {
    const errors = this.validate(form);
    if (Object.keys(errors).length > 0) return { success: false, errors };

    const data = {
      name: form.name.trim(),
      contactPerson: form.contactPerson.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      notes: form.notes.trim() || undefined,
    };

    const existing = editId ? this.db.suppliers.findById(editId) : undefined;
    if (existing) {
      existing.update(data);
      this.db.suppliers.touch();
    } else {
      this.db.suppliers.save(new Supplier({ id: createId("sup"), ...data }));
    }
    return { success: true, errors: {} };
  }

  remove(id: string): void {
    this.db.suppliers.delete(id);
  }
}
