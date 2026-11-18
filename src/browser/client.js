let worker;
let sequence = 0;
const pending = new Map();
function dispose(error) {
  worker?.terminate();
  worker = undefined;
  for (const request of pending.values()) request.reject(error);
  pending.clear();
}
function getWorker() {
  if (!worker) {
    worker = new Worker(new URL("./worker.js", import.meta.url), {
      type: "module",
    });
    worker.onmessage = ({ data }) => {
      const request = pending.get(data.id);
      if (!request) return;
      pending.delete(data.id);
      if (data.error)
        request.reject(
          Object.assign(new Error(data.error.message), {
            code: data.error.code,
          }),
        );
      else request.resolve(data.value);
    };
    worker.onerror = () =>
      dispose(
        new Error(
          "브라우저 SQL 엔진을 불러오지 못했습니다. 페이지를 새로고침해 주세요.",
        ),
      );
  }
  return worker;
}
function send(operation, args, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("실행 요청을 취소했습니다.", "AbortError"));
      return;
    }
    const id = ++sequence;
    const abort = () =>
      dispose(new DOMException("실행 요청을 취소했습니다.", "AbortError"));
    const timer = setTimeout(
      () =>
        dispose(
          Object.assign(
            new Error("브라우저 SQL 실행 제한 시간을 초과했습니다."),
            { code: "ETIMEOUT" },
          ),
        ),
      operation === "query" ? 15000 : 30000,
    );
    const finish = (fn) => (value) => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      fn(value);
    };
    pending.set(id, { resolve: finish(resolve), reject: finish(reject) });
    signal?.addEventListener("abort", abort, { once: true });
    try {
      getWorker().postMessage({ id, operation, args });
    } catch (error) {
      pending.delete(id);
      finish(reject)(error);
    }
  });
}
export async function browserCall(operation, args = [], signal) {
  const id = args[0] || "all";
  if (typeof navigator !== "undefined" && navigator.locks)
    return navigator.locks.request(
      "queryground-browser-db:" + id,
      { signal },
      () => send(operation, args, signal),
    );
  return send(operation, args, signal);
}
