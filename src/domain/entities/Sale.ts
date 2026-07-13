import { Entity } from "../core/Entity";

export type PaymentMethod = "tunai" | "transfer" | "qris";
export type DiscountType = "rp" | "percent";

export const LABEL_PAYMENT_METHOD: Record<PaymentMethod, string> = {
  tunai: "Tunai",
  transfer: "Transfer Bank",
  qris: "QRIS",
};

/**
 * SaleItem — one product line on a sale.
 * Stores a snapshot of the name & price at sale time, so reports stay correct
 * even if the product price changes later.
 */
export class SaleItem {
  constructor(
    readonly productId: string,
    readonly productName: string,
    readonly unitPrice: number,
    readonly unitCost: number,
    readonly quantity: number,
  ) {}

  subtotal(): number {
    return this.unitPrice * this.quantity;
  }

  /** Gross profit for this line (used by the profit report). */
  profit(): number {
    return (this.unitPrice - this.unitCost) * this.quantity;
  }
}

export interface SaleData {
  id: string;
  number: string;
  date: Date;
  cashier: string;
  items: SaleItem[];
  discountType: DiscountType;
  discountValue: number;
  method: PaymentMethod;
  amountPaid: number;
  customerWhatsapp?: string;
}

/** Sale entity — one POS sales receipt. */
export class Sale extends Entity {
  private _number: string;
  private _date: Date;
  private _cashier: string;
  private _items: SaleItem[];
  private _discountType: DiscountType;
  private _discountValue: number;
  private _method: PaymentMethod;
  private _amountPaid: number;
  private _customerWhatsapp?: string;

  constructor(data: SaleData) {
    super(data.id);
    this._number = data.number;
    this._date = data.date;
    this._cashier = data.cashier;
    this._items = [...data.items];
    this._discountType = data.discountType;
    this._discountValue = Math.max(0, data.discountValue);
    this._method = data.method;
    this._amountPaid = Math.max(0, data.amountPaid);
    this._customerWhatsapp = data.customerWhatsapp;
  }

  get number(): string { return this._number; }
  get date(): Date { return this._date; }
  get cashier(): string { return this._cashier; }
  get items(): SaleItem[] { return [...this._items]; }
  get discountType(): DiscountType { return this._discountType; }
  get discountValue(): number { return this._discountValue; }
  get method(): PaymentMethod { return this._method; }
  get amountPaid(): number { return this._amountPaid; }
  get customerWhatsapp(): string | undefined { return this._customerWhatsapp; }

  subtotal(): number {
    return this._items.reduce((total, item) => total + item.subtotal(), 0);
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
    if (this._method !== "tunai") return 0;
    return Math.max(this._amountPaid - this.total(), 0);
  }

  itemCount(): number {
    return this._items.reduce((total, item) => total + item.quantity, 0);
  }

  /** Total gross profit of the sale (revenue minus cost, after discount). */
  profit(): number {
    const gross = this._items.reduce((total, item) => total + item.profit(), 0);
    return gross - this.discount();
  }

  /** Serialize for local storage. */
  toJSON(): SaleJSON {
    return {
      id: this.id,
      number: this._number,
      date: this._date.toISOString(),
      cashier: this._cashier,
      items: this._items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        unitPrice: item.unitPrice,
        unitCost: item.unitCost,
        quantity: item.quantity,
      })),
      discountType: this._discountType,
      discountValue: this._discountValue,
      method: this._method,
      amountPaid: this._amountPaid,
      customerWhatsapp: this._customerWhatsapp,
    };
  }

  static fromJSON(data: SaleJSON): Sale {
    return new Sale({
      ...data,
      date: new Date(data.date),
      items: data.items.map(
        (item) =>
          new SaleItem(
            item.productId,
            item.productName,
            item.unitPrice,
            item.unitCost,
            item.quantity,
          ),
      ),
    });
  }
}

export interface SaleJSON {
  id: string;
  number: string;
  date: string;
  cashier: string;
  items: {
    productId: string;
    productName: string;
    unitPrice: number;
    unitCost: number;
    quantity: number;
  }[];
  discountType: DiscountType;
  discountValue: number;
  method: PaymentMethod;
  amountPaid: number;
  customerWhatsapp?: string;
}
