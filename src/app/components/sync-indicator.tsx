import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { CloudSync } from "../../domain/sync/CloudSync";
import { useSyncStatus } from "../hooks/use-sync-status";

function backupTime(iso: string | null): string {
  if (!iso) return "Belum pernah dicadangkan";
  const date = new Date(iso);
  const isToday = new Date().toDateString() === date.toDateString();
  const time = date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Dicadangkan hari ini ${time}`;
  return `Dicadangkan ${date.toLocaleDateString("id-ID", { day: "numeric", month: "short" })} ${time}`;
}

/**
 * SyncIndicator — boundary kecil di topbar yang menampilkan status cloud:
 * offline, sedang menyinkronkan, atau tersinkron. Klik untuk backup manual.
 */
export function SyncIndicator() {
  const { ready, syncing, online, lastBackup } = useSyncStatus();

  if (!ready) return null;

  async function backupNow() {
    if (syncing) return;
    if (!online) {
      toast.error("Tidak ada koneksi. Backup akan berjalan otomatis saat online.");
      return;
    }
    const result = await CloudSync.backup();
    if (result.success) toast.success(result.message);
    else toast.error(result.message);
  }

  const display = syncing
    ? { icon: <RefreshCw className="size-4 animate-spin" />, label: "Menyinkronkan", color: "text-primary" }
    : online
      ? { icon: <Cloud className="size-4" />, label: "Tersinkron", color: "text-success" }
      : { icon: <CloudOff className="size-4" />, label: "Offline", color: "text-muted-foreground" };

  return (
    <button
      type="button"
      onClick={backupNow}
      disabled={syncing}
      title={`${online ? "Online" : "Offline"} — ${backupTime(lastBackup)}\nKlik untuk backup sekarang`}
      className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-accent disabled:cursor-default disabled:hover:bg-transparent"
    >
      <span className={display.color}>{display.icon}</span>
      <span className="hidden lg:block">{display.label}</span>
    </button>
  );
}
