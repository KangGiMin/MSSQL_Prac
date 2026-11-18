import { timing } from "../config/workbench";
import { useState, useRef, useEffect } from "react";
import { api } from "../lib/api";
export function useQueryRunner(onComplete) {
  const [result, setResult] = useState(null),
    [running, setRunning] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const controller = useRef(null),
    inFlight = useRef(false);
  useEffect(() => () => controller.current?.abort(), []);
  async function run(database, sql) {
    if (inFlight.current || !sql.trim()) return;
    inFlight.current = true;
    setRunning(true);
    setCanceling(false);
    setResult(null);
    controller.current = new AbortController();
    try {
      const data = await api.query(database, sql, controller.current.signal);
      setResult(data);
      onComplete?.({
        id: crypto.randomUUID(),
        database,
        sql,
        time: new Date().toISOString(),
        elapsedMs: data.elapsedMs,
        error: data.error?.message,
        rows: data.recordsets.reduce((sum, r) => sum + r.totalRows, 0),
      });
    } catch (error) {
      const message =
        error.name === "AbortError"
          ? "실행 요청을 취소했습니다. 서버가 연결을 정리하는 동안 잠시 기다려 주세요."
          : error.message;
      setResult({
        recordsets: [],
        rowsAffected: [],
        messages: [],
        error: { message },
      });
      if (error.name === "AbortError") {
        const deadline = Date.now() + timing.cancelWaitMs;
        while (Date.now() < deadline) {
          try {
            if (
              !(
                await api.health(
                  database,
                  AbortSignal.timeout(timing.cancelHealthTimeoutMs),
                )
              ).busy
            )
              break;
          } catch {
            break;
          }
          await new Promise((resolve) =>
            setTimeout(resolve, timing.cancelPollMs),
          );
        }
      }
      onComplete?.({
        id: crypto.randomUUID(),
        database,
        sql,
        time: new Date().toISOString(),
        error: message,
        rows: 0,
      });
    } finally {
      inFlight.current = false;
      setRunning(false);
      setCanceling(false);
    }
  }
  return {
    result,
    running,
    canceling,
    run,
    clear: () => setResult(null),
    cancel: () => {
      setCanceling(true);
      controller.current?.abort();
    },
  };
}
