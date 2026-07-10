import { useCallback, useSyncExternalStore } from "react";
import type { Observable } from "../../domain/core/Observable";

/**
 * Hubungkan boundary (komponen React) dengan controller/repository (Observable).
 * Komponen otomatis dirender ulang setiap kali controller memanggil notify().
 */
export function useController(sumber: Observable): number {
  const subscribe = useCallback(
    (onChange: () => void) => sumber.subscribe(onChange),
    [sumber],
  );
  return useSyncExternalStore(subscribe, () => sumber.versi);
}
