import test from "node:test";
import assert from "node:assert/strict";
import { splitBatches } from "../server/services/batches.mjs";
import { databases, getDatabase } from "../server/config/databases.mjs";
import { lessons, sourceCoverage } from "../shared/curriculum.mjs";
test("GO splits independent batches, including comments", () =>
  assert.deepEqual(splitBatches("SELECT 1;\nGO -- next\nSELECT 2;"), [
    "SELECT 1;",
    "SELECT 2;",
  ]));
test("GO inside strings, brackets, and nested comments stays in the batch", () => {
  const query =
    "SELECT N'a\nGO\nb';\n/* outer\n/* inner */\nGO\n*/\nSELECT [a\nGO\nb];";
  assert.equal(splitBatches(query).length, 1);
});
test("escaped quotes and line comments do not corrupt batch parsing", () =>
  assert.equal(
    splitBatches("SELECT 'it''s SQL'; -- '\nGO\nSELECT 2;").length,
    2,
  ));
test("GO repeat limits and number of batches are explicit", () => {
  assert.throws(() => splitBatches("SELECT 1\nGO 100"), /반복/);
  assert.throws(
    () => splitBatches(Array(32).fill("SELECT 1").join("\nGO\n")),
    /30/,
  );
});
test("database IDs are allow-listed", () => {
  assert.equal(databases.length, 3);
  for (const db of databases)
    assert.match(getDatabase(db.id).name, /^QueryGround_/);
  assert.throws(() => getDatabase("kgm"));
  assert.throws(() => getDatabase("company];DROP DATABASE kgm;--"));
});
test("curriculum has unique IDs and covers the entire supplied PDF", () => {
  assert.equal(new Set(lessons.map((l) => l.id)).size, lessons.length);
  for (let page = 1; page <= 90; page++)
    assert.ok(
      lessons.some(
        (l) => l.pages.length && page >= l.pages[0] && page <= l.pages[1],
      ),
      `uncovered page ${page}`,
    );
  for (const lesson of lessons) {
    assert.ok(lesson.answer.trim());
    assert.ok(lesson.explanation.trim());
    assert.ok(lesson.caution.trim());
    getDatabase(lesson.database);
  }
  assert.equal(sourceCoverage.exercises, 36);
});
