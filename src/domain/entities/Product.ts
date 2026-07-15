import { Entity } from "../core/Entity";

export type ProductCategory = "laptop" | "pc" | "aksesoris" | "sparepart" | "lainnya";
export type StockStatus = "aman" | "menipis" | "habis";

export interface ProductData {
  id: string;
  code: string;
  name: string;
  category: ProductCategory;
  purchasePrice: number;
  sellPrice: number;
  stock: number;
  minStock: number;
  supplier: string;
  specification?: string;
  image?: string;
}

/**
 * Product entity — one item in the store catalog.
 * Attributes are private (encapsulation); stock changes are only allowed via
 * addStock/reduceStock so business rules are always enforced.
 */
export class Product extends Entity {
  private _code: string;
  private _name: string;
  private _category: ProductCategory;
  private _purchasePrice: number;
  private _sellPrice: number;
  private _stock: number;
  private _minStock: number;
  private _supplier: string;
  private _specification?: string;
  private _image?: string;

  constructor(data: ProductData) {
    super(data.id);
    this._code = data.code;
    this._name = data.name;
    this._category = data.category;
    this._purchasePrice = data.purchasePrice;
    this._sellPrice = data.sellPrice;
    this._stock = Math.max(0, data.stock);
    this._minStock = Math.max(0, data.minStock);
    this._supplier = data.supplier;
    this._specification = data.specification;
    this._image = data.image;
  }

  // ----- getters -----
  get code(): string { return this._code; }
  get name(): string { return this._name; }
  get category(): ProductCategory { return this._category; }
  get purchasePrice(): number { return this._purchasePrice; }
  get sellPrice(): number { return this._sellPrice; }
  get stock(): number { return this._stock; }
  get minStock(): number { return this._minStock; }
  get supplier(): string { return this._supplier; }
  get specification(): string | undefined { return this._specification; }
  get image(): string | undefined { return this._image; }

  set category(category: ProductCategory) { this._category = category; }

  // ----- domain methods -----
  stockStatus(): StockStatus {
    if (this._stock === 0) return "habis";
    if (this._stock <= this._minStock) return "menipis";
    return "aman";
  }

  /** Gross profit per unit. */
  margin(): number {
    return this._sellPrice - this._purchasePrice;
  }

  hasStock(quantity: number): boolean {
    return this._stock >= quantity;
  }

  addStock(quantity: number): void {
    if (quantity <= 0) throw new Error("Jumlah stok masuk harus lebih dari 0.");
    this._stock += quantity;
  }

  reduceStock(quantity: number): void {
    if (quantity <= 0) throw new Error("Jumlah stok keluar harus lebih dari 0.");
    if (!this.hasStock(quantity)) {
      throw new Error(`Stok ${this._name} tidak mencukupi (tersedia ${this._stock}).`);
    }
    this._stock -= quantity;
  }

  /** Serialize for local storage. */
  toJSON(): ProductData {
    return {
      id: this.id,
      code: this._code,
      name: this._name,
      category: this._category,
      purchasePrice: this._purchasePrice,
      sellPrice: this._sellPrice,
      stock: this._stock,
      minStock: this._minStock,
      supplier: this._supplier,
      specification: this._specification,
      image: this._image,
    };
  }

  static fromJSON(data: ProductData): Product {
    return new Product(data);
  }

  /** Update from the edit form (called by ProductController). */
  update(data: Omit<ProductData, "id">): void {
    this._code = data.code;
    this._name = data.name;
    this._category = data.category;
    this._purchasePrice = data.purchasePrice;
    this._sellPrice = data.sellPrice;
    this._stock = Math.max(0, data.stock);
    this._minStock = Math.max(0, data.minStock);
    this._supplier = data.supplier;
    this._specification = data.specification;
    this._image = data.image;
  }
}
