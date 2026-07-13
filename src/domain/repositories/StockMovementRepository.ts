import { Repository } from "../core/Repository";
import { StockOut, StockIn, StockMovement } from "../entities/StockMovement";

export class StockMovementRepository extends Repository<StockMovement> {
  /** Polymorphism: filter subclasses using instanceof. */
  listIn(): StockIn[] {
    return this.rows.filter((movement): movement is StockIn => movement instanceof StockIn);
  }

  listOut(): StockOut[] {
    return this.rows.filter((movement): movement is StockOut => movement instanceof StockOut);
  }

  forProduct(productName: string): StockMovement[] {
    return this.rows.filter((movement) => movement.productName === productName);
  }
}
