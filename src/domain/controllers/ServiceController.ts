import { Observable } from "../core/Observable";
import { createId } from "../core/Entity";
import { Database } from "../Database";
import type { Product } from "../entities/Product";
import {
  ServiceOrder,
  STATUS_ORDER,
  type ServicePriority,
  type ServiceStatus,
} from "../entities/ServiceOrder";

export interface NewServiceForm {
  customer: string;
  phone: string;
  address: string;
  unitType: string;
  brand: string;
  model: string;
  complaint: string;
  priority: ServicePriority;
  technician: string;
}

export type ServiceErrors = Record<string, string>;

export const TECHNICIANS = ["Budi Denka", "Rizki Teknisi", "Agus Pratama"];

export const ACCESSORY_OPTIONS = [
  "Charger / Adaptor",
  "Tas Laptop",
  "Baterai",
  "Kabel Data",
  "Dus / Box",
];

/**
 * ServiceController — controller for computer service tickets.
 * Manages the status flow, parts (linked to Product stock), and ticket creation.
 */
export class ServiceController extends Observable {
  private static instance: ServiceController | null = null;
  private db = Database.getInstance();

  private constructor() {
    super();
    this.db.services.subscribe(() => this.notify());
    this.db.products.subscribe(() => this.notify());
  }

  static getInstance(): ServiceController {
    if (!ServiceController.instance) {
      ServiceController.instance = new ServiceController();
    }
    return ServiceController.instance;
  }

  list(keyword = "", status: ServiceStatus | "all" = "all"): ServiceOrder[] {
    return this.db.services.search(keyword, status);
  }

  findById(id: string): ServiceOrder | undefined {
    return this.db.services.findById(id);
  }

  countByStatus(): Record<string, number> {
    const result: Record<string, number> = { all: this.db.services.count() };
    STATUS_ORDER.forEach((status) => {
      result[status] = this.db.services.byStatus(status).length;
    });
    return result;
  }

  changeStatus(id: string, status: ServiceStatus): void {
    const service = this.db.services.findById(id);
    if (service && service.changeStatus(status)) {
      this.db.services.touch();
    }
  }

  updateInfo(
    id: string,
    patch: { complaint?: string; diagnosis?: string; technician?: string; serviceFee?: number },
  ): void {
    const service = this.db.services.findById(id);
    if (!service) return;
    if (patch.complaint !== undefined) service.complaint = patch.complaint;
    if (patch.diagnosis !== undefined) service.diagnosis = patch.diagnosis;
    if (patch.technician !== undefined) service.technician = patch.technician;
    if (patch.serviceFee !== undefined) service.serviceFee = patch.serviceFee;
    this.db.services.touch();
  }

  toggleAccessory(id: string, name: string): void {
    const service = this.db.services.findById(id);
    if (!service) return;
    service.toggleAccessory(name);
    this.db.services.touch();
  }

  /** Part options from inventory (only those still in stock). */
  partOptions(): Product[] {
    return this.db.products.available();
  }

  /** Add a part to the ticket while reducing inventory stock. */
  addPart(id: string, productId: string, quantity: number): { success: boolean; message?: string } {
    const service = this.db.services.findById(id);
    const product = this.db.products.findById(productId);
    if (!service || !product) return { success: false, message: "Data tidak ditemukan." };
    if (!product.hasStock(quantity)) {
      return { success: false, message: `Stok ${product.name} tidak mencukupi (tersedia ${product.stock}).` };
    }
    product.reduceStock(quantity);
    service.addPart(product.id, product.name, quantity, product.sellPrice);
    this.db.services.touch();
    this.db.products.touch();
    return { success: true };
  }

  /** Remove a part from the ticket and return its stock to inventory. */
  removePart(id: string, partId: string): void {
    const service = this.db.services.findById(id);
    if (!service) return;
    const part = service.removePart(partId);
    if (part) {
      this.db.products.findById(part.productId)?.addStock(part.quantity);
      this.db.products.touch();
    }
    this.db.services.touch();
  }

  validate(form: NewServiceForm): ServiceErrors {
    const errors: ServiceErrors = {};
    if (!form.customer.trim()) errors.customer = "Nama pelanggan wajib diisi.";
    if (!form.phone.trim()) errors.phone = "No. WhatsApp wajib diisi.";
    if (!form.unitType) errors.unitType = "Pilih jenis unit.";
    if (!form.brand.trim()) errors.brand = "Merk wajib diisi.";
    if (!form.complaint.trim()) errors.complaint = "Keluhan wajib diisi.";
    return errors;
  }

  createService(form: NewServiceForm): { success: boolean; errors: ServiceErrors } {
    const errors = this.validate(form);
    if (Object.keys(errors).length > 0) return { success: false, errors };

    this.db.services.save(
      new ServiceOrder({
        id: createId("srv"),
        number: this.db.services.nextNumber(),
        customer: form.customer.trim(),
        phone: form.phone.trim(),
        address: form.address.trim() || undefined,
        unitType: form.unitType,
        brand: form.brand.trim(),
        model: form.model.trim() || undefined,
        complaint: form.complaint.trim(),
        technician: form.technician,
        priority: form.priority,
        receivedAt: new Date(),
      }),
    );
    return { success: true, errors: {} };
  }
}
