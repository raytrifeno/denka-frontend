import { Observable } from "../core/Observable";
import { createId } from "../core/Entity";
import { Database } from "../Database";
import { AuthController } from "./AuthController";
import type { Product, ProductCategory } from "../entities/Product";
import {
  SaleItem,
  Sale,
  type PaymentMethod,
  type DiscountType,
} from "../entities/Sale";

export class CartItem {
  constructor(
    readonly product: Product,
    private _quantity: number,
  ) {}

  get quantity(): number { return this._quantity; }

  subtotal(): number {
    return this.product.sellPrice * this._quantity;
  }

  /** Change quantity within 1..product stock. */
  changeQuantity(delta: number): boolean {
    const next = this._quantity + delta;
    if (next <= 0 || next > this.product.stock) return false;
    this._quantity = next;
    return true;
  }
}

/**
 * SaleController — Point of Sale controller.
 * Holds cart & payment state, computes totals, and on payment: creates a
 * Sale entity while reducing Product stock (linking the two entities).
 */
export class SaleController extends Observable {
  private static instance: SaleController | null = null;
  private db = Database.getInstance();
  private auth = AuthController.getInstance();

  private _cart: CartItem[] = [];
  private _discountType: DiscountType = "rp";
  private _discountValue = 0;
  private _method: PaymentMethod = "tunai";
  private _amountPaid = 0;
  private _whatsapp = "";
  private _lastSale: Sale | null = null;

  private constructor() {
    super();
    this.db.products.subscribe(() => this.notify());
  }

  static getInstance(): SaleController {
    if (!SaleController.instance) {
      SaleController.instance = new SaleController();
    }
    return SaleController.instance;
  }

  // ----- catalog -----
  catalog(keyword: string, category: ProductCategory | "all"): Product[] {
    return this.db.products.search({ keyword, category });
  }

  // ----- cart -----
  get cart(): CartItem[] { return [...this._cart]; }
  get discountType(): DiscountType { return this._discountType; }
  get discountValue(): number { return this._discountValue; }
  get method(): PaymentMethod { return this._method; }
  get amountPaid(): number { return this._amountPaid; }
  get whatsapp(): string { return this._whatsapp; }
  get lastSale(): Sale | null { return this._lastSale; }

  addToCart(productId: string): void {
    const product = this.db.products.findById(productId);
    if (!product || product.stock === 0) return;
    const item = this._cart.find((ci) => ci.product.id === productId);
    if (item) {
      if (!item.changeQuantity(1)) return;
    } else {
      this._cart.push(new CartItem(product, 1));
    }
    this.notify();
  }

  changeQuantity(productId: string, delta: number): void {
    const item = this._cart.find((ci) => ci.product.id === productId);
    if (!item) return;
    if (item.quantity + delta <= 0) {
      this.removeFromCart(productId);
      return;
    }
    if (item.changeQuantity(delta)) this.notify();
  }

  removeFromCart(productId: string): void {
    this._cart = this._cart.filter((ci) => ci.product.id !== productId);
    this.notify();
  }

  setDiscount(type: DiscountType, value: number): void {
    this._discountType = type;
    this._discountValue = Math.max(0, value);
    this.notify();
  }

  setMethod(method: PaymentMethod): void {
    this._method = method;
    this.notify();
  }

  setAmountPaid(value: number): void {
    this._amountPaid = Math.max(0, value);
    this.notify();
  }

  setWhatsapp(phone: string): void {
    this._whatsapp = phone;
    this.notify();
  }

  // ----- calculations -----
  subtotal(): number {
    return this._cart.reduce((total, item) => total + item.subtotal(), 0);
  }

  discount(): number {
    const subtotal = this.subtotal();
    if (this._discountType === "percent") {
      return Math.round((subtotal * Math.min(this._discountValue, 100)) / 100);
    }
    return Math.min(this._discountValue, subtotal);
  }

  total(): number {
    return Math.max(this.subtotal() - this.discount(), 0);
  }

  change(): number {
    return Math.max(this._amountPaid - this.total(), 0);
  }

  itemCount(): number {
    return this._cart.reduce((total, item) => total + item.quantity, 0);
  }

  canPay(): boolean {
    if (this._cart.length === 0) return false;
    if (this._method === "tunai") return this._amountPaid >= this.total();
    return true;
  }

  // ----- main business process -----
  /**
   * Process payment: validate stock, create a Sale, reduce Product stock,
   * then save to the repository.
   */
  processPayment(): { success: boolean; message?: string } {
    if (!this.canPay()) {
      return { success: false, message: "Keranjang kosong atau pembayaran belum cukup." };
    }
    for (const item of this._cart) {
      if (!item.product.hasStock(item.quantity)) {
        return { success: false, message: `Stok ${item.product.name} tidak mencukupi.` };
      }
    }

    const sale = new Sale({
      id: createId("trx"),
      number: this.db.sales.nextNumber(),
      date: new Date(),
      cashier: this.auth.currentUserName,
      items: this._cart.map(
        (item) =>
          new SaleItem(
            item.product.id,
            item.product.name,
            item.product.sellPrice,
            item.product.purchasePrice,
            item.quantity,
          ),
      ),
      discountType: this._discountType,
      discountValue: this._discountValue,
      method: this._method,
      amountPaid: this._amountPaid,
      customerWhatsapp: this._whatsapp.trim() || undefined,
    });

    this._cart.forEach((item) => item.product.reduceStock(item.quantity));
    this.db.sales.save(sale);
    this.db.products.touch();

    this._lastSale = sale;
    this.notify();
    return { success: true };
  }

  /** Clear the cart & start a new sale (after the receipt is closed). */
  newSale(): void {
    this._cart = [];
    this._discountType = "rp";
    this._discountValue = 0;
    this._method = "tunai";
    this._amountPaid = 0;
    this._whatsapp = "";
    this._lastSale = null;
    this.notify();
  }
}
