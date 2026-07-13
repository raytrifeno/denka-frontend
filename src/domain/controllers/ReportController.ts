import { Observable } from "../core/Observable";
import { Database } from "../Database";
import type { Product, ProductCategory } from "../entities/Product";
import type { ServiceOrder } from "../entities/ServiceOrder";
import type { Sale } from "../entities/Sale";

export interface SalesPoint {
  label: string;
  total: number;
}

export interface TopProduct {
  name: string;
  category: ProductCategory;
  sold: number;
  revenue: number;
}

export interface StockReportRow {
  name: string;
  openingStock: number;
  incoming: number;
  outgoing: number;
  closingStock: number;
  minStock: number;
}

export interface ProfitRow {
  name: string;
  purchasePrice: number;
  sellPrice: number;
  sold: number;
  profitPerItem: number;
  totalProfit: number;
}

export interface AttentionItem {
  id: string;
  type: "stok" | "service";
  title: string;
  detail: string;
}

const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * ReportController — read-only controller summarizing data from several
 * repositories at once (sales, service, products, stock movements) for the
 * Dashboard and Reports pages.
 */
export class ReportController extends Observable {
  private static instance: ReportController | null = null;
  private db = Database.getInstance();

  private constructor() {
    super();
    this.db.sales.subscribe(() => this.notify());
    this.db.services.subscribe(() => this.notify());
    this.db.products.subscribe(() => this.notify());
    this.db.stockMovements.subscribe(() => this.notify());
  }

  static getInstance(): ReportController {
    if (!ReportController.instance) {
      ReportController.instance = new ReportController();
    }
    return ReportController.instance;
  }

  // ---------- dashboard KPI ----------

  todaySales(): number {
    return this.db.sales.totalOnDate(new Date());
  }

  todaySaleCount(): number {
    return this.db.sales.onDate(new Date()).length;
  }

  /** Today's sales vs yesterday (for the trend badge). */
  trendVsYesterday(): { up: boolean; percent: string } | null {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayTotal = this.db.sales.totalOnDate(yesterday);
    const todayTotal = this.todaySales();
    if (yesterdayTotal === 0) return null;
    const diff = ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100;
    return {
      up: diff >= 0,
      percent: Math.abs(diff).toFixed(1).replace(".", ",") + "%",
    };
  }

  servicesInProgress(): number {
    return this.db.services.inProgress().length;
  }

  servicesCompletedToday(): number {
    const today = startOfDay(new Date()).getTime();
    return this.db.services
      .findAll()
      .filter((service) => {
        const done = service.completedAt();
        return done !== null && startOfDay(done).getTime() === today;
      }).length;
  }

  lowStock(): Product[] {
    return this.db.products.lowStock();
  }

  // ---------- dashboard charts & lists ----------

  salesTrend(days: number): SalesPoint[] {
    const result: SalesPoint[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      result.push({
        label: DAY_NAMES[date.getDay()],
        total: this.db.sales.totalOnDate(date),
      });
    }
    return result;
  }

  /** Service status composition for the donut chart (grouped). */
  serviceComposition(): { queued: number; inProgress: number; done: number; pickedUp: number } {
    const all = this.db.services.findAll();
    const count = (statuses: string[]) =>
      all.filter((service) => statuses.includes(service.status)).length;
    return {
      queued: count(["antri"]),
      inProgress: count(["diperiksa", "dikerjakan", "sparepart"]),
      done: count(["selesai"]),
      pickedUp: count(["diambil"]),
    };
  }

  recentServices(limit: number): ServiceOrder[] {
    return this.db.services
      .findAll()
      .sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime())
      .slice(0, limit);
  }

  topProducts(limit: number, from?: Date, to?: Date): TopProduct[] {
    const agg = new Map<string, TopProduct>();
    this.db.sales.inRange(from, to).forEach((sale) => {
      sale.items.forEach((item) => {
        const product = this.db.products.findById(item.productId);
        const existing = agg.get(item.productName) ?? {
          name: item.productName,
          category: product?.category ?? "lainnya",
          sold: 0,
          revenue: 0,
        };
        existing.sold += item.quantity;
        existing.revenue += item.subtotal();
        agg.set(item.productName, existing);
      });
    });
    return [...agg.values()].sort((a, b) => b.sold - a.sold).slice(0, limit);
  }

  needsAttention(): AttentionItem[] {
    const result: AttentionItem[] = [];
    this.lowStock()
      .slice(0, 2)
      .forEach((product) => {
        result.push({
          id: "stok-" + product.id,
          type: "stok",
          title: product.name,
          detail:
            product.stock === 0
              ? "Stok habis · segera lakukan restock"
              : `Sisa ${product.stock} unit · di bawah batas minimum (${product.minStock})`,
        });
      });
    this.db.services
      .byStatus("selesai")
      .slice(0, 2)
      .forEach((service) => {
        const days = Math.floor(
          (Date.now() - (service.completedAt()?.getTime() ?? Date.now())) / 86400000,
        );
        result.push({
          id: "svc-" + service.id,
          type: "service",
          title: `${service.number} · ${service.brand}`,
          detail: days > 0 ? `Selesai, belum diambil ${days} hari` : "Selesai, siap diambil pelanggan",
        });
      });
    return result;
  }

  /** Topbar notifications: combined stock & service alerts. */
  notifications(): AttentionItem[] {
    return this.needsAttention().slice(0, 4);
  }

  // ---------- report pages ----------

  salesReport(from?: Date, to?: Date): {
    sales: Sale[];
    total: number;
    saleCount: number;
    average: number;
    perDay: SalesPoint[];
  } {
    const sales = this.db.sales
      .inRange(from, to)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    const total = sales.reduce((sum, sale) => sum + sale.total(), 0);

    // per-day chart within the range (max 31 points)
    const perDay: SalesPoint[] = [];
    if (from && to) {
      const cursor = startOfDay(from);
      const end = startOfDay(to).getTime();
      while (cursor.getTime() <= end && perDay.length < 31) {
        perDay.push({
          label: `${cursor.getDate()} ${MONTH_NAMES[cursor.getMonth()]}`,
          total: this.db.sales.totalOnDate(cursor),
        });
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    return {
      sales,
      total,
      saleCount: sales.length,
      average: sales.length > 0 ? Math.round(total / sales.length) : 0,
      perDay,
    };
  }

  stockReport(from?: Date, to?: Date): StockReportRow[] {
    const sold = new Map<string, number>();
    this.db.sales.inRange(from, to).forEach((sale) => {
      sale.items.forEach((item) => {
        sold.set(item.productName, (sold.get(item.productName) ?? 0) + item.quantity);
      });
    });

    return this.db.products.findAll().map((product) => {
      const movements = this.db.stockMovements
        .forProduct(product.name)
        .filter((entry) => {
          if (from && entry.date < startOfDay(from)) return false;
          if (to) {
            const end = new Date(startOfDay(to).getTime() + 86399999);
            if (entry.date > end) return false;
          }
          return true;
        });
      const incoming = movements
        .filter((entry) => entry.kind === "masuk")
        .reduce((total, entry) => total + entry.quantity, 0);
      const outgoingNonSale = movements
        .filter((entry) => entry.kind === "keluar")
        .reduce((total, entry) => total + entry.quantity, 0);
      const outgoing = outgoingNonSale + (sold.get(product.name) ?? 0);
      const closingStock = product.stock;
      return {
        name: product.name,
        openingStock: closingStock - incoming + outgoing,
        incoming,
        outgoing,
        closingStock,
        minStock: product.minStock,
      };
    });
  }

  profitReport(from?: Date, to?: Date): {
    revenue: number;
    cost: number;
    profit: number;
    marginPercent: string;
    perProduct: ProfitRow[];
    weeklyTrend: { period: string; revenue: number; profit: number }[];
  } {
    const sales = this.db.sales.inRange(from, to);

    let revenue = 0;
    let cost = 0;
    const perProductMap = new Map<string, ProfitRow>();
    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        revenue += item.subtotal();
        cost += item.unitCost * item.quantity;
        const row = perProductMap.get(item.productName) ?? {
          name: item.productName,
          purchasePrice: item.unitCost,
          sellPrice: item.unitPrice,
          sold: 0,
          profitPerItem: item.unitPrice - item.unitCost,
          totalProfit: 0,
        };
        row.sold += item.quantity;
        row.totalProfit += item.profit();
        perProductMap.set(item.productName, row);
      });
    });
    const profit = revenue - cost;

    // last 4 weeks trend (from all sales)
    const weeklyTrend: { period: string; revenue: number; profit: number }[] = [];
    for (let week = 3; week >= 0; week--) {
      const end = new Date();
      end.setDate(end.getDate() - week * 7);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      const inWeek = this.db.sales.inRange(start, end);
      weeklyTrend.push({
        period: "Minggu " + (4 - week),
        revenue: inWeek.reduce((total, sale) => total + sale.total(), 0),
        profit: inWeek.reduce((total, sale) => total + sale.profit(), 0),
      });
    }

    return {
      revenue,
      cost,
      profit,
      marginPercent: revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : "0",
      perProduct: [...perProductMap.values()].sort((a, b) => b.totalProfit - a.totalProfit),
      weeklyTrend,
    };
  }

  serviceReport(from?: Date, to?: Date): {
    list: ServiceOrder[];
    incoming: number;
    done: number;
    pending: number;
    revenue: number;
  } {
    const list = this.db.services.findAll().filter((service) => {
      if (from && service.receivedAt < startOfDay(from)) return false;
      if (to) {
        const end = new Date(startOfDay(to).getTime() + 86399999);
        if (service.receivedAt > end) return false;
      }
      return true;
    });
    return {
      list,
      incoming: list.length,
      done: list.filter((service) => service.isDone()).length,
      pending: list.filter((service) => service.isInProgress()).length,
      revenue: list
        .filter((service) => service.status === "diambil")
        .reduce((total, service) => total + service.totalCost(), 0),
    };
  }
}
