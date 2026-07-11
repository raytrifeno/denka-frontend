import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { CloudSync } from "../../domain/sync/CloudSync";
import { useSyncStatus } from "../hooks/use-sync-status";

function waktuBackup(iso: string | null): string {
  if (!iso) return "Belum pernah dicadangkan";
  const tanggal = new Date(iso);
  const hariIni = new Date().toDateString() === tanggal.toDateString();
  const jam = tanggal.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  if (hariIni) return `Dicadangkan hari ini ${jam}`;
  return `Dicadangkan ${tanggal.toLocaleDateString("id-ID", { day: "numeric", month: "short" })} ${jam}`;
}

/**
 * SyncIndicator — boundary kecil di topbar yang menampilkan status cloud:
 * offline, sedang menyinkronkan, atau tersinkron. Klik untuk backup manual.
 */
export function SyncIndicator() {
  const { siap, sinkron, online, terakhirBackup } = useSyncStatus();

  if (!siap) return null;

  async function backupSekarang() {
    if (sinkron) return;
    if (!online) {
      toast.error("Tidak ada koneksi. Backup akan berjalan otomatis saat online.");
      return;
    }
    const hasil = await CloudSync.backup();
    if (hasil.sukses) toast.success(hasil.pesan);
    else toast.error(hasil.pesan);
  }

  const tampilan = sinkron
    ? { icon: <RefreshCw className="size-4 animate-spin" />, label: "Menyinkronkan", warna: "text-primary" }
    : online
      ? { icon: <Cloud className="size-4" />, label: "Tersinkron", warna: "text-success" }
      : { icon: <CloudOff className="size-4" />, label: "Offline", warna: "text-muted-foreground" };

  return (
    <button
      type="button"
      onClick={backupSekarang}
      disabled={sinkron}
      title={`${online ? "Online" : "Offline"} — ${waktuBackup(terakhirBackup)}\nKlik untuk backup sekarang`}
      className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-accent disabled:cursor-default disabled:hover:bg-transparent"
    >
      <span className={tampilan.warna}>{tampilan.icon}</span>
      <span className="hidden lg:block">{tampilan.label}</span>
    </button>
  );
}
