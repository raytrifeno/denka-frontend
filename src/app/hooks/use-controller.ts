import { useCallback, useSyncExternalStore } from "react";
import type { Observable } from "../../domain/core/Observable";

/**
 * Hubungkan boundary (komponen React) dengan controller/repository (Observable).
 * Komponen otomatis dirender ulang setiap kali controller memanggil notify().
 */
export function useController(source: Observable): number {
  const subscribe = useCallback(
    (onChange: () => void) => source.subscribe(onChange),
    [source],
  );
  return useSyncExternalStore(subscribe, () => source.version);
}
