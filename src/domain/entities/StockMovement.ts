import { Entity } from "../core/Entity";

/**
 * StockMovement — abstract base for stock movement records.
 * Inheritance example: StockIn and StockOut inherit the common attributes
 * from StockMovement and add their own specific ones.
 */
export abstract class StockMovement extends Entity {
  private _date: Date;
  private _productName: string;
  private _quantity: number;
  private _recordedBy: string;
  private _note?: string;

  protected constructor(
    id: string,
    date: Date,
    productName: string,
    quantity: number,
    recordedBy: string,
    note?: string,
  ) {
    super(id);
    if (quantity <= 0) throw new Error("Jumlah mutasi stok harus lebih dari 0.");
    this._date = date;
    this._productName = productName;
    this._quantity = quantity;
    this._recordedBy = recordedBy;
    this._note = note;
  }

  get date(): Date { return this._date; }
  get productName(): string { return this._productName; }
  get quantity(): number { return this._quantity; }
  get recordedBy(): string { return this._recordedBy; }
  get note(): string | undefined { return this._note; }

  /** Polymorphism: each subclass declares its own movement kind. */
  abstract get kind(): "masuk" | "keluar";
}

/** StockIn — stock received from a supplier. */
export class StockIn extends StockMovement {
  private _supplier: string;
  private _unitPrice: number;
  private _invoiceNo?: string;

  constructor(data: {
    id: string;
    date: Date;
    productName: string;
    quantity: number;
    supplier: string;
    unitPrice: number;
    invoiceNo?: string;
    note?: string;
    recordedBy: string;
  }) {
    super(data.id, data.date, data.productName, data.quantity, data.recordedBy, data.note);
    this._supplier = data.supplier;
    this._unitPrice = data.unitPrice;
    this._invoiceNo = data.invoiceNo;
  }

  get kind(): "masuk" { return "masuk"; }
  get supplier(): string { return this._supplier; }
  get unitPrice(): number { return this._unitPrice; }
  get invoiceNo(): string | undefined { return this._invoiceNo; }

  totalCost(): number {
    return this._unitPrice * this.quantity;
  }
}

export type StockOutReason = "rusak" | "retur" | "internal" | "lainnya";

export const LABEL_REASON: Record<StockOutReason, string> = {
  rusak: "Rusak",
  retur: "Retur ke Supplier",
  internal: "Pemakaian Internal",
  lainnya: "Lainnya",
};

/** StockOut — stock leaving other than sales (damaged, return, internal). */
export class StockOut extends StockMovement {
  private _reason: StockOutReason;

  constructor(data: {
    id: string;
    date: Date;
    productName: string;
    quantity: number;
    reason: StockOutReason;
    note?: string;
    recordedBy: string;
  }) {
    super(data.id, data.date, data.productName, data.quantity, data.recordedBy, data.note);
    this._reason = data.reason;
  }

  get kind(): "keluar" { return "keluar"; }
  get reason(): StockOutReason { return this._reason; }

  reasonLabel(): string {
    return LABEL_REASON[this._reason];
  }
}

// ---------- serialization ----------

export interface StockMovementJSON {
  kind: "masuk" | "keluar";
  id: string;
  date: string;
  productName: string;
  quantity: number;
  recordedBy: string;
  note?: string;
  // stock-in only
  supplier?: string;
  unitPrice?: number;
  invoiceNo?: string;
  // stock-out only
  reason?: StockOutReason;
}

export function stockMovementToJSON(movement: StockMovement): StockMovementJSON {
  const base = {
    kind: movement.kind,
    id: movement.id,
    date: movement.date.toISOString(),
    productName: movement.productName,
    quantity: movement.quantity,
    recordedBy: movement.recordedBy,
    note: movement.note,
  };
  if (movement instanceof StockIn) {
    return { ...base, supplier: movement.supplier, unitPrice: movement.unitPrice, invoiceNo: movement.invoiceNo };
  }
  if (movement instanceof StockOut) {
    return { ...base, reason: movement.reason };
  }
  return base;
}

/** Rebuild the right subclass from JSON (polymorphism via the `kind` column). */
export function stockMovementFromJSON(data: StockMovementJSON): StockMovement {
  const base = {
    id: data.id,
    date: new Date(data.date),
    productName: data.productName,
    quantity: data.quantity,
    recordedBy: data.recordedBy,
    note: data.note,
  };
  if (data.kind === "masuk") {
    return new StockIn({
      ...base,
      supplier: data.supplier ?? "-",
      unitPrice: data.unitPrice ?? 0,
      invoiceNo: data.invoiceNo,
    });
  }
  return new StockOut({ ...base, reason: data.reason ?? "lainnya" });
}
