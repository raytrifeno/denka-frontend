import { Entity } from "./Entity";
import { Observable } from "./Observable";

/**
 * Repository generik (abstrak) — mensimulasikan tabel database di memori.
 * Kelas turunannya (BarangRepository, SupplierRepository, dst.) menambahkan
 * query khusus per entity. Mewarisi Observable sehingga perubahan data
 * otomatis diberitahukan ke boundary.
 */
export abstract class Repository<T extends Entity> extends Observable {
  protected rows: T[] = [];

  findAll(): T[] {
    return [...this.rows];
  }

  findById(id: string): T | undefined {
    return this.rows.find((row) => row.id === id);
  }

  count(): number {
    return this.rows.length;
  }

  /** Simpan entity: perbarui jika sudah ada, sisipkan di depan jika baru. */
  save(entity: T): T {
    const index = this.rows.findIndex((row) => row.id === entity.id);
    if (index >= 0) this.rows[index] = entity;
    else this.rows.unshift(entity);
    this.notify();
    return entity;
  }

  /** Dipakai saat seeding agar urutan data awal terjaga tanpa notifikasi beruntun. */
  seed(entities: T[]): void {
    this.rows = [...entities];
  }

  delete(id: string): boolean {
    const before = this.rows.length;
    this.rows = this.rows.filter((row) => row.id !== id);
    const removed = this.rows.length < before;
    if (removed) this.notify();
    return removed;
  }

  deleteMany(ids: string[]): number {
    const target = new Set(ids);
    const before = this.rows.length;
    this.rows = this.rows.filter((row) => !target.has(row.id));
    const removedCount = before - this.rows.length;
    if (removedCount > 0) this.notify();
    return removedCount;
  }

  /** Panggil setelah mengubah isi entity secara langsung (in-place mutation). */
  touch(): void {
    this.notify();
  }
}
