import { cloudReady, getCloud } from "./supabase-client";
import { Database } from "../Database";
import { PenyimpananLokal } from "../persistence/PenyimpananLokal";
import { snapshotToTables, tablesToSnapshot, type CloudTables } from "./mapping";

const KUNCI_PENGATURAN = "denka-pengaturan";

/** Urutan tabel yang disinkronkan (nama kolom & tabel dalam bahasa Inggris). */
const TABEL: (keyof CloudTables)[] = [
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

export interface HasilSync {
  sukses: boolean;
  pesan: string;
}

export interface StatusSync {
  siap: boolean;
  sinkron: boolean;
  terakhirBackup: string | null;
}

const KUNCI_TERAKHIR = "denka-backup-terakhir";

let sedangRestore = false;
let sedangBackup = false;
let terakhirBackup: string | null = null;
let timerAuto: ReturnType<typeof setTimeout> | null = null;
const pendengar = new Set<() => void>();

let statusCache: StatusSync = { siap: cloudReady, sinkron: false, terakhirBackup: null };

function beriTahu(): void {
  statusCache = { siap: cloudReady, sinkron: sedangBackup, terakhirBackup };
  pendengar.forEach((cb) => cb());
}

function pesanError(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Terjadi kesalahan saat sinkronisasi.";
}

/** Buat tabel cloud mengikuti data lokal: upsert baris lokal, hapus sisanya. */
async function mirror(tabel: string, baris: { id: string }[]): Promise<void> {
  const cloud = getCloud();
  if (!cloud) return;

  if (baris.length) {
    const { error } = await cloud.from(tabel).upsert(baris);
    if (error) throw error;
  }

  const hapus = cloud.from(tabel).delete();
  const kueri = baris.length
    ? hapus.not("id", "in", `(${baris.map((row) => row.id).join(",")})`)
    : hapus.neq("id", "__none__");
  const { error } = await kueri;
  if (error) throw error;
}

export const CloudSync = {
  get siap(): boolean {
    return cloudReady;
  },

  /** Status terkini untuk indikator di UI (objek stabil untuk useSyncExternalStore). */
  get status(): StatusSync {
    return statusCache;
  },

  /** Berlangganan perubahan status (dipakai indikator sync). */
  subscribe(cb: () => void): () => void {
    pendengar.add(cb);
    return () => pendengar.delete(cb);
  },

  /** Backup (push): cloud menjadi cermin dari data lokal. */
  async backup(): Promise<HasilSync> {
    const cloud = getCloud();
    if (!cloud) return { sukses: false, pesan: "Supabase belum dikonfigurasi." };

    sedangBackup = true;
    beriTahu();
    try {
      const tables = snapshotToTables(Database.getInstance().ambilSnapshot());
      for (const nama of TABEL) {
        await mirror(nama, tables[nama]);
      }

      const pengaturan = PenyimpananLokal.muat<unknown>(KUNCI_PENGATURAN);
      if (pengaturan) {
        const { error } = await cloud
          .from("settings")
          .upsert({ key: KUNCI_PENGATURAN, value: JSON.stringify(pengaturan) });
        if (error) throw error;
      }

      terakhirBackup = new Date().toISOString();
      PenyimpananLokal.simpan(KUNCI_TERAKHIR, terakhirBackup);
      return { sukses: true, pesan: "Backup ke cloud berhasil." };
    } catch (error) {
      return { sukses: false, pesan: pesanError(error) };
    } finally {
      sedangBackup = false;
      beriTahu();
    }
  },

  /** Restore (pull): ganti seluruh data lokal dengan isi cloud. */
  async restore(): Promise<HasilSync> {
    const cloud = getCloud();
    if (!cloud) return { sukses: false, pesan: "Supabase belum dikonfigurasi." };

    sedangRestore = true;
    try {
      const hasil: Record<string, unknown[]> = {};
      for (const nama of TABEL) {
        const { data, error } = await cloud.from(nama).select("*");
        if (error) throw error;
        hasil[nama] = data ?? [];
      }
      Database.getInstance().gantiSemua(tablesToSnapshot(hasil as unknown as CloudTables));

      const { data: setting, error } = await cloud
        .from("settings")
        .select("value")
        .eq("key", KUNCI_PENGATURAN)
        .maybeSingle();
      if (error) throw error;
      if (setting?.value) {
        try {
          PenyimpananLokal.simpan(KUNCI_PENGATURAN, JSON.parse(setting.value));
        } catch {
          // format tak terbaca — biarkan pengaturan lokal apa adanya
        }
      }

      return { sukses: true, pesan: "Data berhasil dipulihkan dari cloud." };
    } catch (error) {
      return { sukses: false, pesan: pesanError(error) };
    } finally {
      sedangRestore = false;
    }
  },

  /** Backup otomatis (debounce) setiap ada perubahan saat perangkat online. */
  aktifkanAutoBackup(): void {
    if (!cloudReady) return;
    terakhirBackup = PenyimpananLokal.muat<string>(KUNCI_TERAKHIR);
    beriTahu();
    Database.getInstance().onChange(() => {
      if (sedangRestore || !navigator.onLine) return;
      if (timerAuto) clearTimeout(timerAuto);
      timerAuto = setTimeout(() => {
        void CloudSync.backup();
      }, 3000);
    });
  },
};
