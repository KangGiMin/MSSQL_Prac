import { queryLimits, connectionLimits } from "../config/limits.mjs";
import { performance } from "node:perf_hooks";
import { connect } from "../db/connection.mjs";
import { config } from "../config/env.mjs";
import { splitBatches } from "./batches.mjs";
import { describeError, httpError } from "./errors.mjs";

export const busyDatabases = new Set();
export async function exclusive(database, operation) {
  if (busyDatabases.has(database)) {
    const error = new Error(
      "이 DB에서 실행 중인 작업이 있습니다. 잠시 후 다시 시도해 주세요.",
    );
    error.status = 409;
    throw error;
  }
  busyDatabases.add(database);
  let lock,
    acquiredLock = false;
  try {
    lock = await connect(config.platform === "azure" ? database : "master", {
      admin: true,
      keepAlive: true,
    });
    const acquired = await lock
      .request()
      .input("resource", `QueryGround:${database}`)
      .query(
        "DECLARE @result INT; EXEC @result=sys.sp_getapplock @Resource=@resource,@LockMode='Exclusive',@LockOwner='Session',@DbPrincipal='public',@LockTimeout=0; SELECT @result AS code;",
      );
    if (acquired.recordset[0].code < 0)
      throw httpError(
        "다른 실행 창이나 프로세스에서 이 DB를 사용 중입니다. 작업이 끝난 뒤 다시 시도해 주세요.",
        409,
      );
    acquiredLock = true;
    return await operation();
  } finally {
    try {
      if (lock && acquiredLock)
        await lock
          .request()
          .input("resource", `QueryGround:${database}`)
          .query(
            "EXEC sys.sp_releaseapplock @Resource=@resource,@LockOwner='Session',@DbPrincipal='public';",
          );
    } finally {
      try {
        if (lock) await lock.close();
      } finally {
        busyDatabases.delete(database);
      }
    }
  }
}
const cell = (value) => {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return "0x" + value.toString("hex");
  if (typeof value === "bigint") return String(value);
  return value;
};
export async function executeQuery(database, source, signal) {
  if (typeof source !== "string" || !source.trim()) {
    const e = new Error("실행할 SQL을 입력해 주세요.");
    e.status = 400;
    throw e;
  }
  if (source.length > queryLimits.sourceLength) {
    const e = new Error(
      `SQL은 ${queryLimits.sourceLength.toLocaleString("en-US")}자 이하로 입력해 주세요.`,
    );
    e.status = 400;
    throw e;
  }
  const batches = splitBatches(source);
  if (!batches.length) throw httpError("실행할 SQL이 없습니다.");
  return exclusive(database, async () => {
    const started = performance.now();
    const deadline = started + config.timeout;
    let pool;
    const result = {
      recordsets: [],
      rowsAffected: [],
      messages: [],
      elapsedMs: 0,
      maxRows: config.maxRows,
      maxBytes: config.maxBytes,
      error: null,
    };
    let active,
      usedBytes = 0,
      batchNumber = 0;
    const cancel = () => active?.cancel();
    signal?.addEventListener("abort", cancel, { once: true });
    const timer = setTimeout(cancel, config.timeout);
    try {
      if (signal?.aborted)
        throw httpError("실행 요청을 취소했습니다.", 400, "ECANCEL");
      pool = await connect(database, { timeout: config.timeout });
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        batchNumber = batchIndex + 1;
        if (signal?.aborted)
          throw httpError("실행 요청을 취소했습니다.", 400, "ECANCEL");
        if (performance.now() >= deadline)
          throw httpError("실행 제한 시간을 초과했습니다.", 400, "ETIMEOUT");
        const request = pool.request();
        request.timeout = Math.max(1, Math.floor(deadline - performance.now()));
        active = request;
        request.stream = true;
        request.arrayRowMode = true;
        let streamError;
        // In streaming mode node-mssql emits errors instead of rejecting the promise.
        request.on("error", (error) => {
          streamError ||= error;
        });
        let current;
        request.on("recordset", (columns) => {
          current = {
            columns: Array.isArray(columns)
              ? columns.map((c) => ({ name: c.name, type: c.type?.name || "" }))
              : Object.values(columns).map((c) => ({
                  name: c.name,
                  type: c.type?.name || "",
                })),
            rows: [],
            totalRows: 0,
            truncated: false,
            batch: batchIndex + 1,
          };
          if (current.columns.length > config.maxColumns) {
            result.messages.push(
              `결과 열은 ${config.maxColumns}개까지 지원합니다. ${batchNumber}번 배치의 넓은 결과는 생략했습니다.`,
            );
          } else if (result.recordsets.length < queryLimits.recordsets)
            result.recordsets.push(current);
          else if (
            !result.messages.includes(
              `결과 테이블은 최대 ${queryLimits.recordsets}개까지 표시합니다.`,
            )
          )
            result.messages.push(
              `결과 테이블은 최대 ${queryLimits.recordsets}개까지 표시합니다.`,
            );
        });
        request.on("row", (row) => {
          if (!current) return;
          current.totalRows++;
          // Native ODBC returns FOR JSON/XML chunks as named properties on an empty array.
          const values =
            Array.isArray(row) && row.length
              ? row
              : current.columns.map(
                  (column, i) => row[column.name] ?? row[i] ?? null,
                );
          if (
            current.rows.length < config.maxRows &&
            result.recordsets.includes(current)
          ) {
            const estimated = values.reduce(
              (sum, value) =>
                sum +
                (typeof value === "string"
                  ? Buffer.byteLength(value)
                  : Buffer.isBuffer(value)
                    ? value.length * 2
                    : queryLimits.estimatedCellBytes),
              0,
            );
            if (usedBytes + estimated > config.maxBytes) {
              current.truncated = true;
              current.limitReason = "bytes";
            } else {
              const normalized = values.map(cell),
                bytes = Buffer.byteLength(JSON.stringify(normalized));
              if (usedBytes + bytes > config.maxBytes) {
                current.truncated = true;
                current.limitReason = "bytes";
              } else {
                usedBytes += bytes;
                current.rows.push(normalized);
              }
            }
          } else {
            current.truncated = true;
            current.limitReason ||= "rows";
          }
        });
        request.on("rowsaffected", (count) => {
          if (result.rowsAffected.length < queryLimits.affectedCounts)
            result.rowsAffected.push(count);
        });
        request.on("info", (info) => {
          if (result.messages.length < queryLimits.messages)
            result.messages.push(info.message);
        });
        await request.batch(batches[batchIndex]);
        if (streamError) throw streamError;
      }
    } catch (error) {
      result.error = {
        message: describeError(error),
        number: error.number || error.originalError?.info?.number,
        line: error.lineNumber || error.originalError?.info?.lineNumber,
        batch: batchNumber || undefined,
        code: error.code,
      };
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancel);
      try {
        const request = pool?.request();
        if (request) request.timeout = connectionLimits.cleanupMs;
        const cleanup =
          request &&
          (await request.batch(
            "IF @@TRANCOUNT > 0 BEGIN ROLLBACK; SELECT 1 AS rolledBack; END;",
          ));
        if (cleanup?.recordset?.[0]?.rolledBack)
          result.messages.push(
            "열려 있는 트랜잭션을 자동 ROLLBACK했습니다. BEGIN TRAN과 COMMIT/ROLLBACK은 한 번의 실행에 작성해 주세요.",
          );
      } catch {
        /* connection may have been closed by the submitted batch */
      }
      if (pool) await pool.close();
      result.elapsedMs = Math.round(performance.now() - started);
    }
    return result;
  });
}
