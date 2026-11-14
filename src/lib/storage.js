import { databases } from "../../shared/databases.mjs";
import { defaultQueries } from "../../shared/workspace.mjs";

const ids = databases.map((db) => db.id);
const stores = new Map();
const localEvents = new EventTarget();
const archivePrefix = "qg.archive.";
const tabId = typeof crypto !== "undefined" ? crypto.randomUUID() : "server";
const isObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value);

export function normalizeStoredValue(key, value, initial) {
  if (key === "qg.database") return ids.includes(value) ? value : initial;
  if (key === "qg.queries" || key === "qg.lessons")
    return Object.fromEntries(
      ids.map((id) => [
        id,
        isObject(value) && typeof value[id] === "string"
          ? value[id]
          : initial[id],
      ]),
    );
  if (key === "qg.completed")
    return [
      ...new Set(
        Array.isArray(value)
          ? value.filter((id) => typeof id === "string")
          : [],
      ),
    ];
  if (["qg.history", "qg.saved"].includes(key)) {
    return (Array.isArray(value) ? value : [])
      .filter(
        (item) =>
          isObject(item) &&
          typeof item.id === "string" &&
          ids.includes(item.database) &&
          typeof item.sql === "string" &&
          typeof item.time === "string" &&
          Number.isFinite(Date.parse(item.time)),
      )
      .slice(0, 100)
      .map((item) => ({
        ...item,
        title: typeof item.title === "string" ? item.title : undefined,
        error: typeof item.error === "string" ? item.error : undefined,
        rows: Number.isFinite(item.rows) ? item.rows : undefined,
        elapsedMs: Number.isFinite(item.elapsedMs) ? item.elapsedMs : undefined,
      }));
  }
  return value == null || typeof value !== typeof initial ? initial : value;
}

function readValue(key, initial) {
  const raw = localStorage.getItem(key);
  if (raw === null) return { value: initial, recovered: false };
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }
  const value = normalizeStoredValue(key, parsed, initial);
  const recovered = JSON.stringify(value) !== JSON.stringify(parsed);
  let backupFailed = false;
  if (recovered) {
    try {
      localStorage.setItem(`qg.recovered.${key}.${crypto.randomUUID()}`, raw);
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      backupFailed = true;
    }
  }
  return { value, recovered, backupFailed };
}

let mutexDatabase;
async function withStorageLock(name, operation) {
  if (typeof navigator !== "undefined" && navigator.locks)
    return navigator.locks.request(name, operation);
  if (typeof indexedDB === "undefined")
    throw new Error("안전한 탭 간 저장을 지원하지 않는 환경입니다.");
  mutexDatabase ||= new Promise((resolve, reject) => {
    const request = indexedDB.open("queryground-storage-lock", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("mutex");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const database = await mutexDatabase;
  return new Promise((resolve, reject) => {
    const transaction = database.transaction("mutex", "readwrite");
    let result;
    transaction.objectStore("mutex").get(name).onsuccess = () => {
      result = operation();
    };
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () =>
      reject(transaction.error || new Error("저장 잠금이 취소되었습니다."));
  });
}

export function workspaceBackup(overrides = {}) {
  const read = (key, initial) => {
    if (stores.has(key)) return stores.get(key).getSnapshot().value;
    try {
      return readValue(key, initial).value;
    } catch {
      return initial;
    }
  };
  const rawStorage = {};
  try {
    for (const key of Object.keys(localStorage))
      if (key.startsWith("qg.")) rawStorage[key] = localStorage.getItem(key);
  } catch {}
  return {
    version: 1,
    queries: read("qg.queries", defaultQueries),
    history: read("qg.history", []),
    saved: read("qg.saved", []),
    completed: read("qg.completed", []),
    lessonIds: read("qg.lessons", {}),
    archives: readArchives(),
    ...overrides,
    rawStorage,
  };
}

export function archiveDraft(
  database,
  sql,
  title = "교체 전 자동 보관",
  id = crypto.randomUUID(),
) {
  if (typeof sql !== "string" || !sql.trim() || !ids.includes(database)) return;
  const item = {
    id,
    database,
    sql,
    title: typeof title === "string" ? title : "자동 보관",
    time: new Date().toISOString(),
  };
  localStorage.setItem(archivePrefix + item.id, JSON.stringify(item));
  localEvents.dispatchEvent(new Event("archive"));
  return item;
}

export function readArchives() {
  try {
    return Object.keys(localStorage)
      .filter((key) => key.startsWith(archivePrefix))
      .flatMap((key) => {
        try {
          return normalizeStoredValue(
            "qg.saved",
            [JSON.parse(localStorage.getItem(key))],
            [],
          );
        } catch {
          return [];
        }
      })
      .sort((a, b) => b.time.localeCompare(a.time));
  } catch {
    return [];
  }
}

export function deleteArchive(id) {
  localStorage.removeItem(archivePrefix + id);
  localEvents.dispatchEvent(new Event("archive"));
}
export function clearArchives() {
  for (const key of Object.keys(localStorage))
    if (key.startsWith(archivePrefix)) localStorage.removeItem(key);
  localEvents.dispatchEvent(new Event("archive"));
}

export function subscribeArchives(listener) {
  const external = (event) => {
    if (event.key === null || event.key?.startsWith(archivePrefix)) listener();
  };
  window.addEventListener("storage", external);
  localEvents.addEventListener("archive", listener);
  return () => {
    window.removeEventListener("storage", external);
    localEvents.removeEventListener("archive", listener);
  };
}

export function getPersistentStore(key, initial) {
  if (stores.has(key)) return stores.get(key);
  let committed = initial,
    snapshot = { value: initial, status: "saved", message: "" };
  let memoryOnly = false,
    queue = Promise.resolve();
  const pending = [],
    failedUpdates = [],
    listeners = new Set();
  const emit = (value, status, message = "") => {
    snapshot = { value, status, message };
    for (const listener of listeners) listener();
  };
  try {
    const read = readValue(key, initial);
    committed = read.value;
    emit(
      committed,
      read.backupFailed ? "error" : read.recovered ? "recovered" : "saved",
      read.recovered
        ? read.backupFailed
          ? "저장 항목을 복구했지만 저장 공간이 부족합니다. 지금 백업해 주세요."
          : "잘못된 저장 항목을 복구했습니다. 정상 항목은 유지했습니다."
        : "",
    );
  } catch {
    memoryOnly = true;
    emit(
      initial,
      "error",
      "브라우저 저장소에 접근할 수 없습니다. SQL을 파일로 백업해 주세요.",
    );
  }

  const project = () =>
    pending.reduce(
      (value, operation) =>
        normalizeStoredValue(key, operation.update(value), initial),
      committed,
    );
  let failedFields = {};
  const rememberFailure = (update) => {
    const previous = committed;
    committed = normalizeStoredValue(key, update(committed), initial);
    if (key === "qg.queries" || key === "qg.lessons") {
      for (const id of ids)
        if (previous[id] !== committed[id]) failedFields[id] = committed[id];
      // Keep only the latest unsaved value per DB, rather than every keystroke's SQL.
      failedUpdates.splice(0, failedUpdates.length, (latest) => ({
        ...latest,
        ...failedFields,
      }));
    } else failedUpdates.push(update);
  };
  const store = {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update(update) {
      const operation = {
        update: typeof update === "function" ? update : () => update,
        expected: snapshot.value,
      };
      pending.push(operation);
      emit(project(), "saving");
      const persist = async () => {
        let success = false,
          message = "";
        try {
          const stored = readValue(key, initial).value;
          const latest = failedUpdates.reduce(
            (value, update) =>
              normalizeStoredValue(key, update(value), initial),
            stored,
          );
          const next = normalizeStoredValue(
            key,
            operation.update(latest),
            initial,
          );
          if (key === "qg.queries")
            for (const id of ids) {
              if (
                next[id] !== latest[id] &&
                latest[id] !== operation.expected[id]
              ) {
                archiveDraft(id, latest[id], "다른 탭과 충돌한 SQL 자동 보관");
              }
              if (memoryOnly || next[id] !== latest[id])
                archiveDraft(
                  id,
                  next[id],
                  "이 탭의 최근 SQL",
                  `tab-${tabId}-${id}`,
                );
            }
          localStorage.setItem(key, JSON.stringify(next));
          committed = next;
          memoryOnly = false;
          failedUpdates.length = 0;
          failedFields = {};
          success = true;
        } catch {
          rememberFailure(operation.update);
          memoryOnly = true;
          message =
            "저장하지 못했습니다. 현재 내용은 이 탭에만 있습니다. 백업 후 저장 공간을 확인해 주세요.";
        }
        pending.splice(pending.indexOf(operation), 1);
        emit(
          project(),
          success ? (pending.length ? "saving" : "saved") : "error",
          message,
        );
        return success;
      };
      const result = queue
        .then(() => withStorageLock(`queryground:${key}`, persist))
        .catch(() => {
          if (pending.includes(operation)) {
            rememberFailure(operation.update);
            pending.splice(pending.indexOf(operation), 1);
            memoryOnly = true;
            emit(
              project(),
              "error",
              "브라우저 저장을 완료하지 못했습니다. 현재 SQL을 백업해 주세요.",
            );
          }
          return false;
        });
      queue = result.catch(() => {});
      return result;
    },
    retry() {
      return store.update((value) => value);
    },
  };
  if (typeof window !== "undefined")
    window.addEventListener("storage", (event) => {
      if (
        key !== "qg.database" &&
        (event.key === key || event.key === null) &&
        !pending.length &&
        !memoryOnly
      ) {
        try {
          committed = readValue(key, initial).value;
          emit(committed, "saved");
        } catch {
          /* retain the current draft */
        }
      }
    });
  stores.set(key, store);
  return store;
}
