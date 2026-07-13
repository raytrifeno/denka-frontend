import type { DatabaseSnapshot } from "../Database";
import type { ProductData, ProductCategory } from "../entities/Product";
import type { SupplierData } from "../entities/Supplier";
import type { UserData, UserRole } from "../entities/User";
import type {
  PaymentMethod,
  DiscountType,
  SaleJSON,
} from "../entities/Sale";
import type {
  ServicePriority,
  ServiceOrderJSON,
  ServiceStatus,
} from "../entities/ServiceOrder";
import type { StockOutReason, StockMovementJSON } from "../entities/StockMovement";

// Baris tabel Supabase — nama kolom mengikuti backend/supabase/schema.sql.

export interface UserRow {
  id: string;
  name: string;
  username: string;
  email: string;
  password: string;
  role: string;
  active: boolean;
  last_login: string | null;
}

export interface SupplierRow {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  items_supplied: string | null;
}

export interface ProductRow {
  id: string;
  code: string;
  name: string;
  category: string;
  purchase_price: number;
  sell_price: number;
  stock: number;
  min_stock: number;
  supplier: string | null;
  specification: string | null;
}

export interface SaleRow {
  id: string;
  number: string;
  sold_at: string;
  cashier_name: string | null;
  discount_type: string | null;
  discount_value: number;
  payment_method: string;
  amount_paid: number;
  customer_whatsapp: string | null;
}

export interface SaleItemRow {
  id: string;
  sale_id: string;
  product_id: string | null;
  product_name: string;
  unit_price: number;
  unit_cost: number;
  quantity: number;
}

export interface ServiceOrderRow {
  id: string;
  number: string;
  customer_name: string;
  customer_phone: string | null;
  customer_address: string | null;
  unit_type: string | null;
  brand: string | null;
  model: string | null;
  serial_no: string | null;
  accessories: string | null;
  complaint: string | null;
  diagnosis: string | null;
  technician: string | null;
  priority: string | null;
  status: string;
  received_at: string;
  service_fee: number;
}

export interface ServicePartRow {
  id: string;
  service_order_id: string;
  product_id: string | null;
  name: string;
  quantity: number;
  price: number;
}

export interface ServiceHistoryRow {
  id: string;
  service_order_id: string;
  status: string;
  changed_at: string;
}

export interface StockMovementRow {
  id: string;
  kind: string;
  product_name: string;
  quantity: number;
  moved_at: string;
  recorded_by: string | null;
  note: string | null;
  supplier: string | null;
  unit_price: number | null;
  invoice_no: string | null;
  reason: string | null;
}

export interface CloudTables {
  users: UserRow[];
  suppliers: SupplierRow[];
  products: ProductRow[];
  sales: SaleRow[];
  sale_items: SaleItemRow[];
  service_orders: ServiceOrderRow[];
  service_parts: ServicePartRow[];
  service_status_history: ServiceHistoryRow[];
  stock_movements: StockMovementRow[];
}

/** Snapshot lokal → baris-baris tabel Supabase (ternormalisasi). */
export function snapshotToTables(snap: DatabaseSnapshot): CloudTables {
  const users: UserRow[] = snap.users.map((u) => ({
    id: u.id,
    name: u.name,
    username: u.username,
    email: u.email,
    password: u.password,
    role: u.role,
    active: u.active,
    last_login: u.lastLogin ? new Date(u.lastLogin).toISOString() : null,
  }));

  const suppliers: SupplierRow[] = snap.suppliers.map((s) => ({
    id: s.id,
    name: s.name,
    contact_person: s.contactPerson || null,
    phone: s.phone || null,
    address: s.address || null,
    notes: s.notes ?? null,
    items_supplied: s.suppliedItems ? JSON.stringify(s.suppliedItems) : null,
  }));

  const products: ProductRow[] = snap.products.map((b) => ({
    id: b.id,
    code: b.code,
    name: b.name,
    category: b.category,
    purchase_price: b.purchasePrice,
    sell_price: b.sellPrice,
    stock: b.stock,
    min_stock: b.minStock,
    supplier: b.supplier || null,
    specification: b.specification ?? null,
  }));

  const sales: SaleRow[] = [];
  const sale_items: SaleItemRow[] = [];
  for (const t of snap.sales) {
    sales.push({
      id: t.id,
      number: t.number,
      sold_at: t.date,
      cashier_name: t.cashier || null,
      discount_type: t.discountType,
      discount_value: t.discountValue,
      payment_method: t.method,
      amount_paid: t.amountPaid,
      customer_whatsapp: t.customerWhatsapp ?? null,
    });
    t.items.forEach((item, index) => {
      sale_items.push({
        id: `${t.id}-${index}`,
        sale_id: t.id,
        product_id: item.productId || null,
        product_name: item.productName,
        unit_price: item.unitPrice,
        unit_cost: item.unitCost,
        quantity: item.quantity,
      });
    });
  }

  const service_orders: ServiceOrderRow[] = [];
  const service_parts: ServicePartRow[] = [];
  const service_status_history: ServiceHistoryRow[] = [];
  for (const s of snap.serviceOrders) {
    service_orders.push({
      id: s.id,
      number: s.number,
      customer_name: s.customer,
      customer_phone: s.phone || null,
      customer_address: s.address ?? null,
      unit_type: s.unitType || null,
      brand: s.brand || null,
      model: s.model ?? null,
      serial_no: s.serialNo ?? null,
      accessories: s.accessories ? JSON.stringify(s.accessories) : null,
      complaint: s.complaint || null,
      diagnosis: s.diagnosis ?? null,
      technician: s.technician || null,
      priority: s.priority,
      status: s.status,
      received_at: s.receivedAt,
      service_fee: s.serviceFee,
    });
    s.parts.forEach((part) => {
      service_parts.push({
        id: part.id,
        service_order_id: s.id,
        product_id: part.productId || null,
        name: part.name,
        quantity: part.quantity,
        price: part.price,
      });
    });
    s.history.forEach((log, index) => {
      service_status_history.push({
        id: `${s.id}-${index}`,
        service_order_id: s.id,
        status: log.status,
        changed_at: log.at,
      });
    });
  }

  const stock_movements: StockMovementRow[] = snap.stockMovements.map((m) => ({
    id: m.id,
    kind: m.kind,
    product_name: m.productName,
    quantity: m.quantity,
    moved_at: m.date,
    recorded_by: m.recordedBy || null,
    note: m.note ?? null,
    supplier: m.supplier ?? null,
    unit_price: m.unitPrice ?? null,
    invoice_no: m.invoiceNo ?? null,
    reason: m.reason ?? null,
  }));

  return {
    users,
    suppliers,
    products,
    sales,
    sale_items,
    service_orders,
    service_parts,
    service_status_history,
    stock_movements,
  };
}

/** Baris-baris tabel Supabase → snapshot lokal (siap dihidrasi Database). */
export function tablesToSnapshot(t: CloudTables): DatabaseSnapshot {
  const products: ProductData[] = t.products.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    category: p.category as ProductCategory,
    purchasePrice: Number(p.purchase_price),
    sellPrice: Number(p.sell_price),
    stock: Number(p.stock),
    minStock: Number(p.min_stock),
    supplier: p.supplier ?? "",
    specification: p.specification ?? undefined,
  }));

  const suppliers: SupplierData[] = t.suppliers.map((s) => ({
    id: s.id,
    name: s.name,
    contactPerson: s.contact_person ?? "",
    phone: s.phone ?? "",
    address: s.address ?? "",
    notes: s.notes ?? undefined,
    suppliedItems: parseArray(s.items_supplied),
  }));

  const users: UserData[] = t.users.map((u) => ({
    id: u.id,
    name: u.name,
    username: u.username,
    email: u.email,
    password: u.password,
    role: u.role as UserRole,
    active: Boolean(u.active),
    lastLogin: u.last_login ? new Date(u.last_login) : null,
  }));

  const itemsBySale = groupBy(t.sale_items, (r) => r.sale_id);
  const sales: SaleJSON[] = t.sales.map((s) => ({
    id: s.id,
    number: s.number,
    date: s.sold_at,
    cashier: s.cashier_name ?? "",
    items: (itemsBySale.get(s.id) ?? []).sort(byIdSuffix).map((item) => ({
      productId: item.product_id ?? "",
      productName: item.product_name,
      unitPrice: Number(item.unit_price),
      unitCost: Number(item.unit_cost),
      quantity: Number(item.quantity),
    })),
    discountType: (s.discount_type ?? "rp") as DiscountType,
    discountValue: Number(s.discount_value),
    method: s.payment_method as PaymentMethod,
    amountPaid: Number(s.amount_paid),
    customerWhatsapp: s.customer_whatsapp ?? undefined,
  }));

  const partsByOrder = groupBy(t.service_parts, (r) => r.service_order_id);
  const historyByOrder = groupBy(t.service_status_history, (r) => r.service_order_id);
  const serviceOrders: ServiceOrderJSON[] = t.service_orders.map((s) => ({
    id: s.id,
    number: s.number,
    customer: s.customer_name,
    phone: s.customer_phone ?? "",
    address: s.customer_address ?? undefined,
    unitType: s.unit_type ?? "",
    brand: s.brand ?? "",
    model: s.model ?? undefined,
    serialNo: s.serial_no ?? undefined,
    accessories: parseArray(s.accessories),
    complaint: s.complaint ?? "",
    diagnosis: s.diagnosis ?? undefined,
    technician: s.technician ?? "",
    priority: (s.priority ?? "normal") as ServicePriority,
    status: s.status as ServiceStatus,
    receivedAt: s.received_at,
    serviceFee: Number(s.service_fee),
    parts: (partsByOrder.get(s.id) ?? []).map((part) => ({
      id: part.id,
      productId: part.product_id ?? "",
      name: part.name,
      quantity: Number(part.quantity),
      price: Number(part.price),
    })),
    history: (historyByOrder.get(s.id) ?? [])
      .slice()
      .sort((a, b) => a.changed_at.localeCompare(b.changed_at))
      .map((log) => ({ status: log.status as ServiceStatus, at: log.changed_at })),
  }));

  const stockMovements: StockMovementJSON[] = t.stock_movements.map((m) => ({
    kind: m.kind === "masuk" ? "masuk" : "keluar",
    id: m.id,
    date: m.moved_at,
    productName: m.product_name,
    quantity: Number(m.quantity),
    recordedBy: m.recorded_by ?? "",
    note: m.note ?? undefined,
    supplier: m.supplier ?? undefined,
    unitPrice: m.unit_price ?? undefined,
    invoiceNo: m.invoice_no ?? undefined,
    reason: (m.reason ?? undefined) as StockOutReason | undefined,
  }));

  return { version: 1, products, suppliers, users, sales, serviceOrders, stockMovements };
}

function parseArray(text: string | null): string[] {
  if (!text) return [];
  try {
    const value = JSON.parse(text);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function groupBy<T>(rows: T[], kunci: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const k = kunci(row);
    const daftar = map.get(k);
    if (daftar) daftar.push(row);
    else map.set(k, [row]);
  }
  return map;
}

/** Urutkan baris anak berdasarkan sufiks angka pada id (`<induk>-<index>`). */
function byIdSuffix(a: { id: string }, b: { id: string }): number {
  return Number(a.id.split("-").pop()) - Number(b.id.split("-").pop());
}
