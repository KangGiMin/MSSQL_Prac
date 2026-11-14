import { useMemo, useSyncExternalStore } from "react";
import { getPersistentStore } from "../lib/storage";
export function useLocalStorage(key, initial) {
  const store = useMemo(() => getPersistentStore(key, initial), [key]);
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
  return [snapshot.value, store.update, { ...snapshot, retry: store.retry }];
}
