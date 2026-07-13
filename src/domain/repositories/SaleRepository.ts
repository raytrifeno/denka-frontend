import { Repository } from "../core/Repository";
import { Sale } from "../entities/Sale";

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export class SaleRepository extends Repository<Sale> {
  /**
   * Next receipt number, derived from the highest stored number
   * (a replacement for DB auto-increment — stays correct after reloading
   * from local storage).
   */
  nextNumber(): string {
    const highest = this.rows.reduce((max, sale) => {
      const n = parseInt(sale.number.replace(/\D/g, ""), 10);
      return Number.isFinite(n) ? Math.max(max, n) : max;
    }, 1042);
    return "TRX-" + (highest + 1);
  }

  onDate(date: Date): Sale[] {
    return this.rows.filter((sale) => sameDay(sale.date, date));
  }

  inRange(from?: Date, to?: Date): Sale[] {
    return this.rows.filter((sale) => {
      const time = sale.date.getTime();
      if (from) {
        const start = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
        if (time < start) return false;
      }
      if (to) {
        const end = new Date(
          to.getFullYear(),
          to.getMonth(),
          to.getDate(),
          23, 59, 59, 999,
        ).getTime();
        if (time > end) return false;
      }
      return true;
    });
  }

  totalOnDate(date: Date): number {
    return this.onDate(date).reduce((total, sale) => total + sale.total(), 0);
  }
}
