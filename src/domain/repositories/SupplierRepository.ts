import { Repository } from "../core/Repository";
import { Supplier } from "../entities/Supplier";

export class SupplierRepository extends Repository<Supplier> {
  cari(kataKunci: string): Supplier[] {
    return this.rows.filter((supplier) => supplier.cocok(kataKunci));
  }

  findByNama(nama: string): Supplier | undefined {
    return this.rows.find((supplier) => supplier.nama === nama);
  }

  daftarNama(): string[] {
    return this.rows.map((supplier) => supplier.nama);
  }
}
