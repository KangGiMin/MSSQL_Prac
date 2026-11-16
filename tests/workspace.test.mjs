import test from "node:test";
import assert from "node:assert/strict";
import {
  validateBackup,
  mergeRecords,
  lessonQuery,
  tablePreviewQuery,
} from "../src/lib/workspace.js";
import { normalizeStoredValue } from "../src/lib/storage.js";
import { clientUrl, isValidPort, proxyHost } from "../shared/runtime.mjs";
import { boundedNumber, queryLimits } from "../server/config/limits.mjs";

test("existing backup files and storage keys remain compatible", () => {
  const backup = {
    version: 1,
    queries: { company: "SELECT 1", store: "SELECT 2", campus: "SELECT 3" },
    history: [],
    saved: [],
    completed: [],
    archives: [],
  };
  assert.doesNotThrow(() => validateBackup(backup));
  assert.deepEqual(
    normalizeStoredValue("qg.queries", backup.queries, {}),
    backup.queries,
  );
  for (const change of [
    { version: 2 },
    { queries: { campus: "SELECT 3" } },
    { saved: {} },
  ])
    assert.throws(() => validateBackup({ ...backup, ...change }), /백업 파일/);
});

test("backup merging preserves record order, existing duplicate values, and the 100-record limit", () => {
  const current = { id: "same", sql: "current draft" };
  assert.deepEqual(
    mergeRecords(
      [{ id: "imported" }, { id: "same", sql: "backup draft" }, null, {}],
      [current, { id: "existing" }],
    ),
    [{ id: "imported" }, current, { id: "existing" }],
  );
  const records = Array.from({ length: 120 }, (_, index) => ({
    id: String(index),
  }));
  assert.deepEqual(mergeRecords(records, []), records.slice(0, 100));
});

test("lesson and table preview SQL retain their exact text and identifier escaping", () => {
  const lesson = {
    title: "연습",
    explanation: "직접 작성",
    answer: "SELECT 1;",
  };
  assert.equal(
    lessonQuery(lesson, false),
    "-- 연습\n-- 직접 작성\n\n-- 여기에 SQL을 작성해 보세요.\n",
  );
  assert.equal(lessonQuery(lesson, true), "-- 연습\nSELECT 1;");
  const prepared = { ...lesson, setup: "SELECT 0;\n" };
  assert.equal(
    lessonQuery(prepared, false),
    "-- 연습\n-- 직접 작성\n\n-- 선행 실습 준비\nSELECT 0;\n\n-- 여기에 SQL을 작성해 보세요.\n",
  );
  assert.equal(
    lessonQuery(prepared, true),
    "-- 연습\n-- 선행 실습 준비\nSELECT 0;\nSELECT 1;",
  );
  assert.equal(
    tablePreviewQuery({ schema: "odd]schema", name: "table]name" }),
    "SELECT TOP (100) *\nFROM [odd]]schema].[table]]name];",
  );
});

test("shared network defaults retain port validation and wildcard/IPv6 proxy behavior", () => {
  assert.equal(clientUrl(), "http://127.0.0.1:5173");
  assert.equal(clientUrl({ CLIENT_PORT: "6123" }), "http://127.0.0.1:6123");
  for (const port of [1, 5173, 65535]) assert.equal(isValidPort(port), true);
  for (const port of [0, 65536, 1.5, NaN, "5173"])
    assert.equal(isValidPort(port), false);
  for (const host of [undefined, "", "0.0.0.0", "::"])
    assert.equal(proxyHost(host), "127.0.0.1");
  assert.equal(proxyHost("::1"), "[::1]");
  assert.equal(proxyHost("localhost"), "localhost");
});

test("query settings retain existing fallback and clamping rules", () => {
  for (const value of [undefined, "", "bad", "0"]) {
    assert.equal(boundedNumber(value, queryLimits.timeout), 15000);
    assert.equal(boundedNumber(value, queryLimits.rows), 1000);
    assert.equal(boundedNumber(value, queryLimits.megabytes), 8);
  }
  assert.equal(boundedNumber("-1", queryLimits.timeout), 1000);
  assert.equal(boundedNumber("90000", queryLimits.timeout), 60000);
  assert.equal(boundedNumber("-1", queryLimits.rows), 1);
  assert.equal(boundedNumber("9000", queryLimits.rows), 5000);
  assert.equal(boundedNumber("64", queryLimits.megabytes), 32);
});
