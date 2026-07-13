import { Repository } from "../core/Repository";
import { ServiceOrder, type ServiceStatus } from "../entities/ServiceOrder";

export class ServiceRepository extends Repository<ServiceOrder> {
  /** Next ticket number, derived from the highest stored number. */
  nextNumber(): string {
    const highest = this.rows.reduce((max, service) => {
      const n = parseInt(service.number.replace(/\D/g, ""), 10);
      return Number.isFinite(n) ? Math.max(max, n) : max;
    }, 43);
    return "#SRV-" + String(highest + 1).padStart(4, "0");
  }

  byStatus(status: ServiceStatus): ServiceOrder[] {
    return this.rows.filter((service) => service.status === status);
  }

  inProgress(): ServiceOrder[] {
    return this.rows.filter((service) => service.isInProgress());
  }

  search(keyword: string, status?: ServiceStatus | "all"): ServiceOrder[] {
    return this.rows.filter(
      (service) =>
        service.matches(keyword) && (!status || status === "all" || service.status === status),
    );
  }
}
