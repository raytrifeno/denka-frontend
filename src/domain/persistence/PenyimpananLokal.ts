import Database from "@tauri-apps/plugin-sql";
import { isTauri } from "@tauri-apps/api/core";

/**
 * PenyimpananLokal — satu pintu penyimpanan lokal untuk seluruh domain.
 * Di aplikasi Tauri datanya tersimpan di SQLite (tabel kv_store) agar aman &
 * mudah di-backup; di browser biasa memakai localStorage sebagai cadangan.
 * `init()` memuat isi SQLite ke cache lebih dulu supaya API tetap sinkron;
 * tulisan berikutnya diteruskan ke SQLite di latar belakang.
 */
type Cache = Record<string, string>;

let db: Database | null = null;
let backend: "sqlite" | "web" = "web";
const cache: Cache = {};
const sessionCache: Cache = {};

export class PenyimpananLokal {
  static async init(): Promise<void> {
    if (!isTauri()) {
      backend = "web";
      return;
    }
    db = await Database.load("sqlite:denka.db");
    const rows = await db.select<{ key: string; value: string }[]>(
      "SELECT key, value FROM kv_store",
    );
    for (const row of rows) cache[row.key] = row.value;
    backend = "sqlite";
  }

  static get tersedia(): boolean {
    return backend === "sqlite" || typeof window !== "undefined";
  }

  static muat<T>(kunci: string, sesi = false): T | null {
    const teks = PenyimpananLokal.baca(kunci, sesi);
    if (teks == null) return null;
    try {
      return JSON.parse(teks) as T;
    } catch {
      return null;
    }
  }

  static simpan(kunci: string, nilai: unknown, sesi = false): void {
    PenyimpananLokal.tulis(kunci, JSON.stringify(nilai), sesi);
  }

  static hapus(kunci: string, sesi = false): void {
    if (backend === "sqlite") {
      if (sesi) {
        delete sessionCache[kunci];
        return;
      }
      delete cache[kunci];
      void db?.execute("DELETE FROM kv_store WHERE key = $1", [kunci]);
      return;
    }
    PenyimpananLokal.web(sesi)?.removeItem(kunci);
  }

  private static baca(kunci: string, sesi: boolean): string | null {
    if (backend === "sqlite") {
      return (sesi ? sessionCache : cache)[kunci] ?? null;
    }
    return PenyimpananLokal.web(sesi)?.getItem(kunci) ?? null;
  }

  private static tulis(kunci: string, teks: string, sesi: boolean): void {
    if (backend === "sqlite") {
      if (sesi) {
        sessionCache[kunci] = teks;
        return;
      }
      cache[kunci] = teks;
      void db?.execute(
        "INSERT INTO kv_store (key, value, updated_at) VALUES ($1, $2, $3) " +
          "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
        [kunci, teks, new Date().toISOString()],
      );
      return;
    }
    try {
      PenyimpananLokal.web(sesi)?.setItem(kunci, teks);
    } catch {
      // kuota penuh / mode privat — abaikan agar aplikasi tetap berjalan
    }
  }

  private static web(sesi: boolean): Storage | null {
    try {
      if (typeof window === "undefined") return null;
      return sesi ? window.sessionStorage : window.localStorage;
    } catch {
      return null;
    }
  }
}
