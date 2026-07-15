import { Observable } from "../core/Observable";
import { createId } from "../core/Entity";
import { Database } from "../Database";
import { Product, type ProductCategory } from "../entities/Product";
import type { ProductFilter } from "../repositories/ProductRepository";

export interface ProductForm {
  name: string;
  code: string;
  category: string;
  supplier: string;
  purchasePrice: string;
  sellPrice: string;
  stock: string;
  minStock: string;
  specification: string;
  image: string;
}

export type ProductFormErrors = Partial<Record<keyof ProductForm, string>>;

/**
 * ProductController — product catalog management.
 * Holds the validation and business rules previously scattered in components.
 */
export class ProductController extends Observable {
  private static instance: ProductController | null = null;
  private db = Database.getInstance();

  private constructor() {
    super();
    // forward repository changes to boundaries subscribed to this controller
    this.db.products.subscribe(() => this.notify());
    this.db.suppliers.subscribe(() => this.notify());
  }

  static getInstance(): ProductController {
    if (!ProductController.instance) {
      ProductController.instance = new ProductController();
    }
    return ProductController.instance;
  }

  list(filter: ProductFilter = {}): Product[] {
    return this.db.products.search(filter);
  }

  findById(id: string): Product | undefined {
    return this.db.products.findById(id);
  }

  supplierNames(): string[] {
    return this.db.suppliers.listNames();
  }

  generateCode(category: string): string {
    const prefix = (category ? category.slice(0, 2) : "BR").toUpperCase();
    return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  validate(form: ProductForm, editId?: string): ProductFormErrors {
    const errors: ProductFormErrors = {};
    if (!form.name.trim()) errors.name = "Nama barang wajib diisi.";
    if (!form.code.trim()) errors.code = "Kode/SKU wajib diisi.";
    else {
      const duplicate = this.db.products.findByCode(form.code.trim());
      if (duplicate && duplicate.id !== editId) errors.code = "Kode/SKU sudah dipakai barang lain.";
    }
    if (!form.category) errors.category = "Pilih kategori.";
    if (!form.supplier) errors.supplier = "Pilih supplier.";
    if (!form.purchasePrice) errors.purchasePrice = "Harga beli wajib diisi.";
    if (!form.sellPrice) errors.sellPrice = "Harga jual wajib diisi.";
    else if (form.purchasePrice && Number(form.sellPrice) < Number(form.purchasePrice)) {
      errors.sellPrice = "Harga jual < harga beli.";
    }
    if (form.stock === "") errors.stock = "Stok awal wajib diisi.";
    if (form.minStock === "") errors.minStock = "Stok minimum wajib diisi.";
    return errors;
  }

  /** Save a new product or update an existing one. */
  save(form: ProductForm, editId?: string): { success: boolean; errors: ProductFormErrors } {
    const errors = this.validate(form, editId);
    if (Object.keys(errors).length > 0) return { success: false, errors };

    const data = {
      code: form.code.trim(),
      name: form.name.trim(),
      category: form.category as ProductCategory,
      purchasePrice: Number(form.purchasePrice),
      sellPrice: Number(form.sellPrice),
      stock: Number(form.stock),
      minStock: Number(form.minStock),
      supplier: form.supplier,
      specification: form.specification.trim() || undefined,
      image: form.image || undefined,
    };

    const existing = editId ? this.db.products.findById(editId) : undefined;
    if (existing) {
      existing.update(data);
      this.db.products.touch();
    } else {
      this.db.products.save(new Product({ id: createId("brg"), ...data }));
      this.db.suppliers.findByName(data.supplier)?.addSuppliedItem(data.name);
    }
    return { success: true, errors: {} };
  }

  remove(id: string): void {
    this.db.products.delete(id);
  }

  removeMany(ids: string[]): void {
    this.db.products.deleteMany(ids);
  }

  setCategoryMany(ids: string[], category: ProductCategory): void {
    ids.forEach((id) => {
      const product = this.db.products.findById(id);
      if (product) product.category = category;
    });
    this.db.products.touch();
  }
}
