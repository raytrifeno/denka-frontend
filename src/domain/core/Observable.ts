/**
 * Kelas dasar yang mengimplementasikan pola desain Observer.
 * Repository dan Controller mewarisi kelas ini agar boundary (komponen React)
 * dapat berlangganan (subscribe) dan otomatis dirender ulang saat data berubah.
 */
export type Listener = () => void;

export abstract class Observable {
  private listeners = new Set<Listener>();
  private _versi = 0;

  /** Nomor versi bertambah setiap kali data berubah — dipakai sebagai snapshot React. */
  get versi(): number {
    return this._versi;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  protected notify(): void {
    this._versi++;
    this.listeners.forEach((listener) => listener());
  }
}
