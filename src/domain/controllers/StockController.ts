import { Observable } from "../core/Observable";
import { createId } from "../core/Entity";
import { Database } from "../Database";
import { AuthController } from "./AuthController";
import type { Product } from "../entities/Product";
import { StockOut, StockIn, type StockOutReason } from "../entities/StockMovement";

export interface StockInForm {
  productName: string;
  supplier: string;
  quantity: string;
  unitPrice: string;
  date: Date;
  invoiceNo: string;
  note: string;
}

export interface StockOutForm {
  productName: string;
  quantity: string;
  reason: StockOutReason | "";
  note: string;
}

export type StockErrors = Record<string, string>;

/**
 * StockController — controller for stock movements.
 * Records StockIn/StockOut entities AND keeps the Product stock consistent.
 */
export class StockController extends Observable {
  private static instance: StockController | null = null;
  private db = Database.getInstance();
  private auth = AuthController.getInstance();

  private constructor() {
    super();
    this.db.stockMovements.subscribe(() => this.notify());
    this.db.products.subscribe(() => this.notify());
  }

  static getInstance(): StockController {
    if (!StockController.instance) {
      StockController.instance = new StockController();
    }
    return StockController.instance;
  }

  listStockIn(): StockIn[] {
    return this.db.stockMovements.listIn();
  }

  listStockOut(): StockOut[] {
    return this.db.stockMovements.listOut();
  }

  /** Product options for the form dropdown. */
  productOptions(): Product[] {
    return this.db.products.findAll();
  }

  supplierNames(): string[] {
    return this.db.suppliers.listNames();
  }

  availableStock(productName: string): number | null {
    return this.db.products.findByName(productName)?.stock ?? null;
  }

  lastPurchasePrice(productName: string): number | null {
    return this.db.products.findByName(productName)?.purchasePrice ?? null;
  }

  validateIn(form: StockInForm): StockErrors {
    const errors: StockErrors = {};
    if (!form.productName) errors.productName = "Pilih barang.";
    if (!form.supplier) errors.supplier = "Pilih supplier.";
    if (!form.quantity || Number(form.quantity) <= 0) errors.quantity = "Jumlah masuk harus lebih dari 0.";
    if (!form.unitPrice) errors.unitPrice = "Harga beli satuan wajib diisi.";
    return errors;
  }

  recordStockIn(form: StockInForm): { success: boolean; errors: StockErrors } {
    const errors = this.validateIn(form);
    if (Object.keys(errors).length > 0) return { success: false, errors };

    const barang = this.db.products.findByName(form.productName);
    if (!barang) return { success: false, errors: { productName: "Barang tidak ditemukan." } };

    barang.addStock(Number(form.quantity));
    this.db.suppliers.findByName(form.supplier)?.addSuppliedItem(barang.name);
    this.db.stockMovements.save(
      new StockIn({
        id: createId("in"),
        date: form.date,
        productName: barang.name,
        quantity: Number(form.quantity),
        supplier: form.supplier,
        unitPrice: Number(form.unitPrice),
        invoiceNo: form.invoiceNo.trim() || undefined,
        note: form.note.trim() || undefined,
        recordedBy: this.auth.currentUserName,
      }),
    );
    this.db.products.touch();
    return { success: true, errors: {} };
  }

  validateOut(form: StockOutForm): StockErrors {
    const errors: StockErrors = {};
    if (!form.productName) errors.productName = "Pilih barang.";
    const available = this.availableStock(form.productName);
    if (!form.quantity || Number(form.quantity) <= 0) {
      errors.quantity = "Jumlah keluar harus lebih dari 0.";
    } else if (available !== null && Number(form.quantity) > available) {
      errors.quantity = `Jumlah melebihi stok tersedia (${available}).`;
    }
    if (!form.reason) errors.reason = "Pilih alasan.";
    return errors;
  }

  recordStockOut(form: StockOutForm): { success: boolean; errors: StockErrors } {
    const errors = this.validateOut(form);
    if (Object.keys(errors).length > 0) return { success: false, errors };

    const barang = this.db.products.findByName(form.productName);
    if (!barang) return { success: false, errors: { productName: "Barang tidak ditemukan." } };

    barang.reduceStock(Number(form.quantity));
    this.db.stockMovements.save(
      new StockOut({
        id: createId("out"),
        date: new Date(),
        productName: barang.name,
        quantity: Number(form.quantity),
        reason: form.reason as StockOutReason,
        note: form.note.trim() || undefined,
        recordedBy: this.auth.currentUserName,
      }),
    );
    this.db.products.touch();
    return { success: true, errors: {} };
  }
}
