import { performance } from 'node:perf_hooks';
import { connect } from '../db/connection.mjs';
import { config } from '../config/env.mjs';
import { splitBatches } from './batches.mjs';

export const busyDatabases = new Set();
export async function exclusive(database, operation) {
  if (busyDatabases.has(database)) { const error = new Error('이 DB에서 실행 중인 작업이 있습니다. 잠시 후 다시 시도해 주세요.'); error.status = 409; throw error; }
  busyDatabases.add(database);
  try { return await operation(); } finally { busyDatabases.delete(database); }
}
const cell = value => {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return '0x' + value.toString('hex').slice(0, 20000);
  if (typeof value === 'bigint') return String(value);
  if (typeof value === 'string' && value.length > 20000) return value.slice(0, 20000) + '… [생략]';
  return value;
};
export async function executeQuery(database, source, signal) {
  if (typeof source !== 'string' || !source.trim()) { const e = new Error('실행할 SQL을 입력해 주세요.'); e.status = 400; throw e; }
  if (source.length > 50000) { const e = new Error('SQL은 50,000자 이하로 입력해 주세요.'); e.status = 400; throw e; }
  const batches = splitBatches(source);
  if (!batches.length) throw new Error('실행할 SQL이 없습니다.');
  return exclusive(database, async () => {
    const started = performance.now();
    const pool = await connect(database);
    const result = { recordsets: [], rowsAffected: [], messages: [], elapsedMs: 0, maxRows: config.maxRows, error: null };
    let active;
    const cancel = () => active?.cancel();
    signal?.addEventListener('abort', cancel, { once: true });
    const timer = setTimeout(cancel, config.timeout);
    try {
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        if (signal?.aborted || performance.now() - started > config.timeout) throw new Error('실행 시간이 초과되었거나 요청이 취소되었습니다.');
        const request = pool.request();
        active = request;
        request.stream = true;
        request.arrayRowMode = true;
        let streamError;
        // In streaming mode node-mssql emits errors instead of rejecting the promise.
        request.on('error', error => { streamError ||= error; });
        let current;
        request.on('recordset', columns => {
          current = { columns: Array.isArray(columns) ? columns.map(c => ({ name: c.name, type: c.type?.name || '' })) : Object.values(columns).map(c => ({ name: c.name, type: c.type?.name || '' })), rows: [], totalRows: 0, truncated: false, batch: batchIndex + 1 };
          if (result.recordsets.length < 20) result.recordsets.push(current);
          else if (!result.messages.includes('결과 테이블은 최대 20개까지 표시합니다.')) result.messages.push('결과 테이블은 최대 20개까지 표시합니다.');
        });
        request.on('row', row => {
          if (!current) return;
          current.totalRows++;
          // Native ODBC returns FOR JSON/XML chunks as named properties on an empty array.
          const values=Array.isArray(row)&&row.length ? row : current.columns.map((column,i)=>row[column.name]??row[i]??null);
          if (current.rows.length < config.maxRows && result.recordsets.includes(current)) current.rows.push(values.map(cell));
          else current.truncated = true;
        });
        request.on('rowsaffected', count => { if (result.rowsAffected.length < 100) result.rowsAffected.push(count); });
        request.on('info', info => { if (result.messages.length < 100) result.messages.push(info.message); });
        await request.batch(batches[batchIndex]);
        if (streamError) throw streamError;
      }
    } catch (error) {
      result.error = { message: error.message, number: error.number || error.originalError?.info?.number, line: error.lineNumber || error.originalError?.info?.lineNumber, code: error.code };
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
      try {
        const cleanup = await pool.request().batch('IF @@TRANCOUNT > 0 BEGIN ROLLBACK; SELECT 1 AS rolledBack; END;');
        if (cleanup.recordset?.[0]?.rolledBack) result.messages.push('열려 있는 트랜잭션을 자동 ROLLBACK했습니다. BEGIN TRAN과 COMMIT/ROLLBACK은 한 번의 실행에 작성해 주세요.');
      } catch { /* connection may have been closed by the submitted batch */ }
      await pool.close();
      result.elapsedMs = Math.round(performance.now() - started);
    }
    return result;
  });
}
