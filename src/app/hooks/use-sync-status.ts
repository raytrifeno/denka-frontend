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
    const naik = () => setOnline(true);
    const turun = () => setOnline(false);
    window.addEventListener("online", naik);
    window.addEventListener("offline", turun);
    return () => {
      window.removeEventListener("online", naik);
      window.removeEventListener("offline", turun);
    };
  }, []);

  return { ...status, online };
}
