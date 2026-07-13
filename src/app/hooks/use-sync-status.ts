import { useEffect, useState, useSyncExternalStore } from "react";
import { CloudSync } from "../../domain/sync/CloudSync";

/**
 * Gabungan status koneksi (online/offline) dan status backup cloud
 * (sedang menyinkronkan, waktu backup terakhir) untuk indikator di topbar.
 */
export function useSyncStatus() {
  const status = useSyncExternalStore(
    (onChange) => CloudSync.subscribe(onChange),
    () => CloudSync.status,
  );

  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return { ...status, online };
}
