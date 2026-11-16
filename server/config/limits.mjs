export const mebibyte = 1024 * 1024;

export const queryLimits = {
  timeout: { min: 1000, max: 60000, default: 15000 },
  rows: { min: 1, max: 5000, default: 1000 },
  megabytes: { min: 1, max: 32, default: 8 },
  columns: 256,
  sourceLength: 50000,
  batches: 30,
  recordsets: 20,
  messages: 100,
  affectedCounts: 100,
  estimatedCellBytes: 32,
  requestBody: "256kb",
};

export const connectionLimits = {
  connectMs: 8000,
  idleMs: 1000,
  lockMs: 5000,
  cleanupMs: 2000,
};

export function boundedNumber(value, { min, max, default: fallback }) {
  return Math.min(max, Math.max(min, Number(value) || fallback));
}
