import test from "node:test";
import assert from "node:assert/strict";
import { normalizeStoredValue } from "../src/lib/storage.js";
import { buildCsv } from "../src/lib/export.js";
import { splitBatches } from "../server/services/batches.mjs";
import { formatType } from "../server/services/schema-service.mjs";

test("damaged storage retains valid records and sanitizes renderable fields", () => {
  assert.deepEqual(normalizeStoredValue("qg.completed", {}, []), []);
  const entry = {
    id: "one",
    database: "campus",
    sql: "SELECT 1",
    time: new Date().toISOString(),
    title: { bad: true },
    error: { bad: true },
  };
  const result = normalizeStoredValue(
    "qg.saved",
    [null, entry, { ...entry, id: "two", database: "unknown" }],
    [],
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].title, undefined);
  assert.equal(result[0].error, undefined);
  assert.deepEqual(
    normalizeStoredValue(
      "qg.queries",
      { company: "kept", campus: 123 },
      { company: "a", store: "b", campus: "c" },
    ),
    { company: "kept", store: "b", campus: "c" },
  );
});
test("CSV distinguishes NULL, empty text, and a literal NULL token; headers are guarded", () => {
  const csv = buildCsv({
    columns: [{ name: "=1+1" }, { name: "text" }],
    rows: [
      [null, ""],
      ["\\N", "  =HYPERLINK(1)"],
    ],
  });
  assert.ok(csv.startsWith('\uFEFF"\'=1+1"'));
  assert.ok(csv.includes('\\N,""'));
  assert.ok(csv.includes('"\\\\N"'));
  assert.ok(csv.includes('"\'  =HYPERLINK(1)"'));
});
test("unsupported batch inputs are HTTP 400 errors", () => {
  for (const input of [
    "SELECT 1\nGO 2",
    Array(31).fill("SELECT 1").join("\nGO\n"),
  ]) {
    assert.throws(
      () => splitBatches(input),
      (error) => error.status === 400,
    );
  }
});
test("schema types preserve string lengths, decimals, and user types", () => {
  assert.equal(
    formatType({ dataType: "nvarchar", maxLength: 40 }),
    "nvarchar(20)",
  );
  assert.equal(
    formatType({ dataType: "varchar", maxLength: -1 }),
    "varchar(max)",
  );
  assert.equal(
    formatType({ dataType: "decimal", precision: 12, scale: 2 }),
    "decimal(12,2)",
  );
  assert.equal(
    formatType({ userDefined: true, typeSchema: "dbo", dataType: "Code" }),
    "dbo.Code",
  );
});
