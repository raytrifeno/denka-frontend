import Database from "@tauri-apps/plugin-sql";
import { isTauri } from "@tauri-apps/api/core";

/**
 * LocalStore — satu pintu penyimpanan lokal untuk seluruh domain.
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

export class LocalStore {
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

  static get available(): boolean {
    return backend === "sqlite" || typeof window !== "undefined";
  }

  static load<T>(key: string, session = false): T | null {
    const text = LocalStore.read(key, session);
    if (text == null) return null;
    try {
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
  }

  static save(key: string, value: unknown, session = false): void {
    LocalStore.write(key, JSON.stringify(value), session);
  }

  static remove(key: string, session = false): void {
    if (backend === "sqlite") {
      if (session) {
        delete sessionCache[key];
        return;
      }
      delete cache[key];
      void db?.execute("DELETE FROM kv_store WHERE key = $1", [key]);
      return;
    }
    LocalStore.webStorage(session)?.removeItem(key);
  }

  private static read(key: string, session: boolean): string | null {
    if (backend === "sqlite") {
      return (session ? sessionCache : cache)[key] ?? null;
    }
    return LocalStore.webStorage(session)?.getItem(key) ?? null;
  }

  private static write(key: string, text: string, session: boolean): void {
    if (backend === "sqlite") {
      if (session) {
        sessionCache[key] = text;
        return;
      }
      cache[key] = text;
      void db?.execute(
        "INSERT INTO kv_store (key, value, updated_at) VALUES ($1, $2, $3) " +
          "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
        [key, text, new Date().toISOString()],
      );
      return;
    }
    try {
      LocalStore.webStorage(session)?.setItem(key, text);
    } catch {
      // kuota penuh / mode privat — abaikan agar aplikasi tetap berjalan
    }
  }

  private static webStorage(session: boolean): Storage | null {
    try {
      if (typeof window === "undefined") return null;
      return session ? window.sessionStorage : window.localStorage;
    } catch {
      return null;
    }
  }
}
