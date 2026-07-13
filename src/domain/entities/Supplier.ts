import { Entity } from "../core/Entity";

export interface SupplierData {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  address: string;
  notes?: string;
  suppliedItems?: string[];
}

/** Supplier entity — a store goods supplier. */
export class Supplier extends Entity {
  private _name: string;
  private _contactPerson: string;
  private _phone: string;
  private _address: string;
  private _notes?: string;
  private _suppliedItems: string[];

  constructor(data: SupplierData) {
    super(data.id);
    this._name = data.name;
    this._contactPerson = data.contactPerson;
    this._phone = data.phone;
    this._address = data.address;
    this._notes = data.notes;
    this._suppliedItems = data.suppliedItems ?? [];
  }

  get name(): string { return this._name; }
  get contactPerson(): string { return this._contactPerson; }
  get phone(): string { return this._phone; }
  get address(): string { return this._address; }
  get notes(): string | undefined { return this._notes; }
  get suppliedItems(): string[] { return [...this._suppliedItems]; }

  itemCount(): number {
    return this._suppliedItems.length;
  }

  /** Record that this supplier provides a given product (called on stock-in). */
  addSuppliedItem(productName: string): void {
    if (!this._suppliedItems.includes(productName)) {
      this._suppliedItems.push(productName);
    }
  }

  update(data: Omit<SupplierData, "id" | "suppliedItems">): void {
    this._name = data.name;
    this._contactPerson = data.contactPerson;
    this._phone = data.phone;
    this._address = data.address;
    this._notes = data.notes;
  }

  /** Serialize for local storage. */
  toJSON(): SupplierData {
    return {
      id: this.id,
      name: this._name,
      contactPerson: this._contactPerson,
      phone: this._phone,
      address: this._address,
      notes: this._notes,
      suppliedItems: [...this._suppliedItems],
    };
  }

  static fromJSON(data: SupplierData): Supplier {
    return new Supplier(data);
  }

  /** Match for the search box. */
  matches(keyword: string): boolean {
    const q = keyword.trim().toLowerCase();
    if (!q) return true;
    return (
      this._name.toLowerCase().includes(q) ||
      this._contactPerson.toLowerCase().includes(q) ||
      this._phone.includes(q)
    );
  }
}
