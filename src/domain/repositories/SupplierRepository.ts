import { Repository } from "../core/Repository";
import { Supplier } from "../entities/Supplier";

export class SupplierRepository extends Repository<Supplier> {
  search(keyword: string): Supplier[] {
    return this.rows.filter((supplier) => supplier.matches(keyword));
  }

  findByName(name: string): Supplier | undefined {
    return this.rows.find((supplier) => supplier.name === name);
  }

  listNames(): string[] {
    return this.rows.map((supplier) => supplier.name);
  }
}
