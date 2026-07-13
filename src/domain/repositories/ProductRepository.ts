import { Repository } from "../core/Repository";
import { Product, type ProductCategory, type StockStatus } from "../entities/Product";

export interface ProductFilter {
  keyword?: string;
  category?: ProductCategory | "all";
  stockStatus?: StockStatus | "all";
}

export class ProductRepository extends Repository<Product> {
  findByName(name: string): Product | undefined {
    return this.rows.find((product) => product.name === name);
  }

  findByCode(code: string): Product | undefined {
    return this.rows.find((product) => product.code.toLowerCase() === code.toLowerCase());
  }

  search(filter: ProductFilter): Product[] {
    const q = (filter.keyword ?? "").trim().toLowerCase();
    return this.rows.filter((product) => {
      const matchKeyword =
        !q ||
        product.name.toLowerCase().includes(q) ||
        product.code.toLowerCase().includes(q) ||
        (product.specification ?? "").toLowerCase().includes(q);
      const matchCategory =
        !filter.category || filter.category === "all" || product.category === filter.category;
      const matchStock =
        !filter.stockStatus || filter.stockStatus === "all" || product.stockStatus() === filter.stockStatus;
      return matchKeyword && matchCategory && matchStock;
    });
  }

  lowStock(): Product[] {
    return this.rows.filter((product) => product.stockStatus() !== "aman");
  }

  available(): Product[] {
    return this.rows.filter((product) => product.stock > 0);
  }
}
