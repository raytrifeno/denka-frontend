import { Entity, createId } from "../core/Entity";

export type ServiceStatus =
  | "antri"
  | "diperiksa"
  | "dikerjakan"
  | "sparepart"
  | "selesai"
  | "diambil";

export const STATUS_ORDER: ServiceStatus[] = [
  "antri",
  "diperiksa",
  "dikerjakan",
  "sparepart",
  "selesai",
  "diambil",
];

export type ServicePriority = "normal" | "urgent";

/** One spare part used while working on a service order. */
export class ServicePart {
  constructor(
    readonly id: string,
    readonly productId: string,
    readonly name: string,
    readonly quantity: number,
    readonly price: number,
  ) {}

  subtotal(): number {
    return this.price * this.quantity;
  }
}

/** One status-change entry on the service timeline. */
export class StatusLog {
  constructor(
    readonly status: ServiceStatus,
    readonly at: Date,
  ) {}
}

export interface ServiceOrderData {
  id: string;
  number: string;
  customer: string;
  phone: string;
  address?: string;
  unitType: string;
  brand: string;
  model?: string;
  serialNo?: string;
  accessories?: string[];
  complaint: string;
  diagnosis?: string;
  technician: string;
  priority: ServicePriority;
  status?: ServiceStatus;
  receivedAt: Date;
  serviceFee?: number;
  parts?: ServicePart[];
  history?: StatusLog[];
}

/**
 * ServiceOrder entity — one repair/service ticket.
 * Status changes only go through changeStatus() so history is always logged.
 */
export class ServiceOrder extends Entity {
  private _number: string;
  private _customer: string;
  private _phone: string;
  private _address?: string;
  private _unitType: string;
  private _brand: string;
  private _model?: string;
  private _serialNo?: string;
  private _accessories: string[];
  private _complaint: string;
  private _diagnosis?: string;
  private _technician: string;
  private _priority: ServicePriority;
  private _status: ServiceStatus;
  private _receivedAt: Date;
  private _serviceFee: number;
  private _parts: ServicePart[];
  private _history: StatusLog[];

  constructor(data: ServiceOrderData) {
    super(data.id);
    this._number = data.number;
    this._customer = data.customer;
    this._phone = data.phone;
    this._address = data.address;
    this._unitType = data.unitType;
    this._brand = data.brand;
    this._model = data.model;
    this._serialNo = data.serialNo;
    this._accessories = data.accessories ?? [];
    this._complaint = data.complaint;
    this._diagnosis = data.diagnosis;
    this._technician = data.technician;
    this._priority = data.priority;
    this._status = data.status ?? "antri";
    this._receivedAt = data.receivedAt;
    this._serviceFee = data.serviceFee ?? 0;
    this._parts = data.parts ?? [];
    this._history = data.history ?? [new StatusLog(this._status, data.receivedAt)];
  }

  // ----- getters -----
  get number(): string { return this._number; }
  get customer(): string { return this._customer; }
  get phone(): string { return this._phone; }
  get address(): string | undefined { return this._address; }
  get unitType(): string { return this._unitType; }
  get brand(): string { return this._brand; }
  get model(): string | undefined { return this._model; }
  get serialNo(): string | undefined { return this._serialNo; }
  get accessories(): string[] { return [...this._accessories]; }
  get complaint(): string { return this._complaint; }
  get diagnosis(): string | undefined { return this._diagnosis; }
  get technician(): string { return this._technician; }
  get priority(): ServicePriority { return this._priority; }
  get status(): ServiceStatus { return this._status; }
  get receivedAt(): Date { return this._receivedAt; }
  get serviceFee(): number { return this._serviceFee; }
  get parts(): ServicePart[] { return [...this._parts]; }
  get history(): StatusLog[] { return [...this._history]; }

  // ----- domain methods -----
  /** Change status and log it. Returns false if the status is unchanged. */
  changeStatus(status: ServiceStatus): boolean {
    if (status === this._status) return false;
    this._status = status;
    this._history.push(new StatusLog(status, new Date()));
    return true;
  }

  isDone(): boolean {
    return this._status === "selesai" || this._status === "diambil";
  }

  isInProgress(): boolean {
    return !this.isDone();
  }

  /** First date the status became "selesai" (for reports), null if not yet. */
  completedAt(): Date | null {
    const log = this._history.find((entry) => entry.status === "selesai");
    return log ? log.at : null;
  }

  totalCost(): number {
    return this._serviceFee + this._parts.reduce((total, part) => total + part.subtotal(), 0);
  }

  addPart(productId: string, name: string, quantity: number, price: number): ServicePart {
    const part = new ServicePart(createId("part"), productId, name, quantity, price);
    this._parts.push(part);
    return part;
  }

  removePart(partId: string): ServicePart | undefined {
    const part = this._parts.find((item) => item.id === partId);
    this._parts = this._parts.filter((item) => item.id !== partId);
    return part;
  }

  toggleAccessory(name: string): void {
    if (this._accessories.includes(name)) {
      this._accessories = this._accessories.filter((item) => item !== name);
    } else {
      this._accessories.push(name);
    }
  }

  set complaint(complaint: string) { this._complaint = complaint; }
  set diagnosis(diagnosis: string | undefined) { this._diagnosis = diagnosis; }
  set technician(technician: string) { this._technician = technician; }
  set serviceFee(fee: number) { this._serviceFee = Math.max(0, fee); }

  /** Match for the search box. */
  matches(keyword: string): boolean {
    const q = keyword.trim().toLowerCase();
    if (!q) return true;
    return this._customer.toLowerCase().includes(q) || this._number.toLowerCase().includes(q);
  }

  /** Serialize for local storage. */
  toJSON(): ServiceOrderJSON {
    return {
      id: this.id,
      number: this._number,
      customer: this._customer,
      phone: this._phone,
      address: this._address,
      unitType: this._unitType,
      brand: this._brand,
      model: this._model,
      serialNo: this._serialNo,
      accessories: [...this._accessories],
      complaint: this._complaint,
      diagnosis: this._diagnosis,
      technician: this._technician,
      priority: this._priority,
      status: this._status,
      receivedAt: this._receivedAt.toISOString(),
      serviceFee: this._serviceFee,
      parts: this._parts.map((part) => ({
        id: part.id,
        productId: part.productId,
        name: part.name,
        quantity: part.quantity,
        price: part.price,
      })),
      history: this._history.map((log) => ({ status: log.status, at: log.at.toISOString() })),
    };
  }

  static fromJSON(data: ServiceOrderJSON): ServiceOrder {
    return new ServiceOrder({
      ...data,
      receivedAt: new Date(data.receivedAt),
      parts: data.parts.map(
        (part) => new ServicePart(part.id, part.productId, part.name, part.quantity, part.price),
      ),
      history: data.history.map((log) => new StatusLog(log.status, new Date(log.at))),
    });
  }
}

export interface ServiceOrderJSON {
  id: string;
  number: string;
  customer: string;
  phone: string;
  address?: string;
  unitType: string;
  brand: string;
  model?: string;
  serialNo?: string;
  accessories: string[];
  complaint: string;
  diagnosis?: string;
  technician: string;
  priority: ServicePriority;
  status: ServiceStatus;
  receivedAt: string;
  serviceFee: number;
  parts: { id: string; productId: string; name: string; quantity: number; price: number }[];
  history: { status: ServiceStatus; at: string }[];
}
