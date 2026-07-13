/**
 * Kelas abstrak dasar untuk semua entity class.
 * Setiap entity memiliki identitas unik yang tidak dapat diubah (enkapsulasi).
 */
export abstract class Entity {
  private readonly _id: string;

  protected constructor(id: string) {
    this._id = id;
  }

  get id(): string {
    return this._id;
  }

  equals(other: Entity): boolean {
    return this._id === other.id;
  }
}

/** Pembuat id unik sederhana untuk entity baru (pengganti auto-increment database). */
let counter = 0;
export function createId(prefix: string): string {
  counter++;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}
