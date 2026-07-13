import { cloudReady, getCloud } from "./supabase-client";
import { Database } from "../Database";
import { LocalStore } from "../persistence/LocalStore";
import { snapshotToTables, tablesToSnapshot, type CloudTables } from "./mapping";

const KEY_SETTINGS = "denka-settings";

/** Urutan tabel yang disinkronkan (nama kolom & tabel dalam bahasa Inggris). */
const TABLES: (keyof CloudTables)[] = [
  "users",
  "suppliers",
  "products",
  "sales",
  "sale_items",
  "service_orders",
  "service_parts",
  "service_status_history",
  "stock_movements",
];

export interface SyncResult {
  success: boolean;
  message: string;
}

export interface SyncStatus {
  ready: boolean;
  syncing: boolean;
  lastBackup: string | null;
}

const KEY_LAST_BACKUP = "denka-last-backup";

let restoring = false;
let backingUp = false;
let lastBackup: string | null = null;
let autoTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

let statusCache: SyncStatus = { ready: cloudReady, syncing: false, lastBackup: null };

function notify(): void {
  statusCache = { ready: cloudReady, syncing: backingUp, lastBackup };
  listeners.forEach((cb) => cb());
}

function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Terjadi kesalahan saat sinkronisasi.";
}

/** Buat tabel cloud mengikuti data lokal: upsert baris lokal, hapus sisanya. */
async function mirror(table: string, rows: { id: string }[]): Promise<void> {
  const cloud = getCloud();
  if (!cloud) return;

  if (rows.length) {
    const { error } = await cloud.from(table).upsert(rows);
    if (error) throw error;
  }

  const del = cloud.from(table).delete();
  const query = rows.length
    ? del.not("id", "in", `(${rows.map((row) => row.id).join(",")})`)
    : del.neq("id", "__none__");
  const { error } = await query;
  if (error) throw error;
}

export const CloudSync = {
  get ready(): boolean {
    return cloudReady;
  },

  /** Status terkini untuk indikator di UI (objek stabil untuk useSyncExternalStore). */
  get status(): SyncStatus {
    return statusCache;
  },

  /** Berlangganan perubahan status (dipakai indikator sync). */
  subscribe(cb: () => void): () => void {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },

  /** Backup (push): cloud menjadi cermin dari data lokal. */
  async backup(): Promise<SyncResult> {
    const cloud = getCloud();
    if (!cloud) return { success: false, message: "Supabase belum dikonfigurasi." };

    backingUp = true;
    notify();
    try {
      const tables = snapshotToTables(Database.getInstance().takeSnapshot());
      for (const name of TABLES) {
        await mirror(name, tables[name]);
      }

      const settings = LocalStore.load<unknown>(KEY_SETTINGS);
      if (settings) {
        const { error } = await cloud
          .from("settings")
          .upsert({ key: KEY_SETTINGS, value: JSON.stringify(settings) });
        if (error) throw error;
      }

      lastBackup = new Date().toISOString();
      LocalStore.save(KEY_LAST_BACKUP, lastBackup);
      return { success: true, message: "Backup ke cloud berhasil." };
    } catch (error) {
      return { success: false, message: errorMessage(error) };
    } finally {
      backingUp = false;
      notify();
    }
  },

  /** Restore (pull): ganti seluruh data lokal dengan isi cloud. */
  async restore(): Promise<SyncResult> {
    const cloud = getCloud();
    if (!cloud) return { success: false, message: "Supabase belum dikonfigurasi." };

    restoring = true;
    try {
      const result: Record<string, unknown[]> = {};
      for (const name of TABLES) {
        const { data, error } = await cloud.from(name).select("*");
        if (error) throw error;
        result[name] = data ?? [];
      }
      Database.getInstance().replaceAll(tablesToSnapshot(result as unknown as CloudTables));

      const { data: setting, error } = await cloud
        .from("settings")
        .select("value")
        .eq("key", KEY_SETTINGS)
        .maybeSingle();
      if (error) throw error;
      if (setting?.value) {
        try {
          LocalStore.save(KEY_SETTINGS, JSON.parse(setting.value));
        } catch {
          // format tak terbaca — biarkan pengaturan lokal apa adanya
        }
      }

      return { success: true, message: "Data berhasil dipulihkan dari cloud." };
    } catch (error) {
      return { success: false, message: errorMessage(error) };
    } finally {
      restoring = false;
    }
  },

  /** Backup otomatis (debounce) setiap ada perubahan saat perangkat online. */
  enableAutoBackup(): void {
    if (!cloudReady) return;
    lastBackup = LocalStore.load<string>(KEY_LAST_BACKUP);
    notify();
    Database.getInstance().onChange(() => {
      if (restoring || !navigator.onLine) return;
      if (autoTimer) clearTimeout(autoTimer);
      autoTimer = setTimeout(() => {
        void CloudSync.backup();
      }, 3000);
    });
  },
};
