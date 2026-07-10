import { Repository } from "../core/Repository";
import { ServiceOrder, type StatusService } from "../entities/ServiceOrder";

export class ServiceRepository extends Repository<ServiceOrder> {
  /** Nomor tiket berikutnya, diturunkan dari nomor tertinggi yang tersimpan. */
  nomorBerikutnya(): string {
    const tertinggi = this.rows.reduce((maks, service) => {
      const angka = parseInt(service.nomor.replace(/\D/g, ""), 10);
      return Number.isFinite(angka) ? Math.max(maks, angka) : maks;
    }, 43);
    return "#SRV-" + String(tertinggi + 1).padStart(4, "0");
  }

  byStatus(status: StatusService): ServiceOrder[] {
    return this.rows.filter((service) => service.status === status);
  }

  sedangBerjalan(): ServiceOrder[] {
    return this.rows.filter((service) => service.sedangBerjalan());
  }

  cari(kataKunci: string, status?: StatusService | "all"): ServiceOrder[] {
    return this.rows.filter(
      (service) =>
        service.cocok(kataKunci) && (!status || status === "all" || service.status === status),
    );
  }
}
