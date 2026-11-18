import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import initSqlJs from "sql.js";
import { createBrowserEngine } from "../src/browser/engine.mjs";
import { compileTokens, tokenize } from "../src/browser/compiler.mjs";
import { practiceProblems } from "../shared/practice-problems.mjs";
import { lessons } from "../shared/curriculum.mjs";
import { browserLessonLimits } from "../src/config/browserSupport.js";
const SQL = await initSqlJs();
const seeds = Object.fromEntries(
  await Promise.all(
    ["company", "store", "campus"].map(async (id) => [
      id,
      await fs.readFile(`database/seeds/${id}.sql`, "utf8"),
    ]),
  ),
);
function workspace() {
  const saved = new Map();
  return createBrowserEngine({
    SQL,
    seeds,
    load: async (id) => saved.get(id),
    save: async (id, bytes, revision) => {
      assert.equal(saved.get(id)?.revision || 0, revision);
      saved.set(id, { bytes: new Uint8Array(bytes), revision: revision + 1 });
    },
  });
}
const successful = async (engine, id, sql) => {
  const result = await engine.query(id, sql);
  assert.equal(result.error, null, result.error?.message);
  return result;
};
test("three real SQLite databases contain the complete seed data", async () => {
  const engine = workspace();
  for (const [id, table, rows] of [
    ["company", "EMP", 14],
    ["store", "Products", 8],
    ["campus", "exam_emp", 140],
  ]) {
    assert.equal(
      (await successful(engine, id, `SELECT COUNT(*) FROM dbo.${table};`))
        .recordsets[0].rows[0][0],
      rows,
    );
    assert.ok((await engine.schema(id)).length >= 4);
  }
  assert.equal(
    (
      await successful(
        engine,
        "campus",
        "SELECT COUNT(*) FROM exam_emp WHERE 성명 LIKE N'가상지원자%';",
      )
    ).recordsets[0].rows[0][0],
    120,
  );
});
test("CRUD changes persist across requests and reset restores only the selected database", async () => {
  const engine = workspace();
  await successful(
    engine,
    "company",
    "INSERT dbo.BONUS(ENAME,SAL) VALUES(N'브라우저테스트',100); UPDATE dbo.BONUS SET SAL=200 WHERE ENAME=N'브라우저테스트';",
  );
  let result = await successful(
    engine,
    "company",
    "SELECT SAL FROM dbo.BONUS WHERE ENAME=N'브라우저테스트';",
  );
  assert.equal(result.recordsets[0].rows[0][0], 200);
  await successful(
    engine,
    "company",
    "DELETE dbo.BONUS WHERE ENAME=N'브라우저테스트';",
  );
  await successful(
    engine,
    "store",
    "UPDATE Products SET Price=123 WHERE ProductID=1;",
  );
  await engine.reset("company");
  assert.equal(
    (await successful(engine, "company", "SELECT COUNT(*) FROM BONUS;"))
      .recordsets[0].rows[0][0],
    2,
  );
  assert.equal(
    (
      await successful(
        engine,
        "store",
        "SELECT Price FROM Products WHERE ProductID=1;",
      )
    ).recordsets[0].rows[0][0],
    123,
  );
});
test("all 24 free-practice answers execute against the correct browser dataset", async () => {
  const engine = workspace();
  for (const problem of practiceProblems) {
    const result = await successful(engine, problem.database, problem.answer);
    assert.equal(result.recordsets.length, 1, problem.id);
    assert.ok(result.recordsets[0].totalRows > 0, problem.id);
  }
});
test("TOP, ties, Unicode strings, duplicate column names and comments are preserved", async () => {
  const engine = workspace();
  assert.equal(
    (
      await successful(
        engine,
        "campus",
        "SELECT TOP (10) WITH TIES * FROM dbo.exam ORDER BY 영어 DESC;",
      )
    ).recordsets[0].totalRows,
    12,
  );
  assert.equal(
    (
      await successful(
        engine,
        "campus",
        "SELECT * FROM dbo.exam WHERE 성명 LIKE N'김%';",
      )
    ).recordsets[0].totalRows,
    4,
  );
  const result = await successful(
    engine,
    "company",
    "SELECT 1 AS x,2 AS x,'dbo.EMP; GO' AS text; -- GO\nGO\nSELECT 3;",
  );
  assert.deepEqual(result.recordsets[0].rows[0], [1, 2, "dbo.EMP; GO"]);
  assert.equal(result.recordsets.length, 2);
  assert.equal(result.recordsets[0].columns[0].name, "x");
  assert.equal(result.recordsets[0].columns[1].name, "x");
});
test("transactions, uncommitted cleanup, CTEs, views and foreign keys execute in SQLite", async () => {
  const engine = workspace();
  await successful(engine, "company", "BEGIN TRAN; DELETE FROM EMP; ROLLBACK;");
  assert.equal(
    (await successful(engine, "company", "SELECT COUNT(*) FROM EMP;"))
      .recordsets[0].rows[0][0],
    14,
  );
  const r = await successful(
    engine,
    "company",
    "BEGIN TRAN; DELETE FROM EMP; SELECT COUNT(*) FROM EMP;",
  );
  assert.equal(r.recordsets[0].rows[0][0], 0);
  assert.equal(
    (await successful(engine, "company", "SELECT COUNT(*) FROM EMP;"))
      .recordsets[0].rows[0][0],
    14,
  );
  await successful(
    engine,
    "company",
    "CREATE TABLE Parent(id INT PRIMARY KEY); CREATE TABLE Child(id INT REFERENCES Parent(id) ON DELETE CASCADE); INSERT Parent VALUES(1); INSERT Child VALUES(1); DELETE FROM Parent;",
  );
  assert.equal(
    (await successful(engine, "company", "SELECT COUNT(*) FROM Child;"))
      .recordsets[0].rows[0][0],
    0,
  );
  await successful(
    engine,
    "store",
    "CREATE OR ALTER VIEW totals AS SELECT OrderID,SUM(Quantity*UnitPrice) AS Total FROM OrderItems GROUP BY OrderID;\nGO\nSELECT * FROM totals;",
  );
  assert.equal(
    (
      await successful(
        engine,
        "company",
        ";WITH E AS (SELECT * FROM EMP WHERE DEPTNO=20) SELECT COUNT(*) FROM E;",
      )
    ).recordsets[0].rows[0][0],
    6,
  );
});
test("SELECT INTO, date functions, prepared columns and metadata are usable", async () => {
  const engine = workspace();
  await successful(
    engine,
    "campus",
    "SELECT 성명,영어 INTO copy_exam FROM dbo.exam WHERE 영어>90;",
  );
  assert.equal(
    (await successful(engine, "campus", "SELECT COUNT(*) FROM copy_exam;"))
      .recordsets[0].rows[0][0],
    5,
  );
  const dates = await successful(
    engine,
    "campus",
    "SELECT DATEADD(DAY,100,'20260101'),DATEDIFF(DAY,'20260101','20260111'),CONVERT(DATE,'20401010',112); SELECT LEFT(N'홍길동',1),RIGHT(N'홍길동',2),SUBSTRING(CAST(123456 AS CHAR(6)),3,2);",
  );
  assert.deepEqual(dates.recordsets[0].rows[0], [
    "2026-04-11 00:00:00.000",
    10,
    "2040-10-10",
  ]);
  assert.deepEqual(dates.recordsets[1].rows[0], ["홍", "길동", "34"]);
  await successful(
    engine,
    "campus",
    "IF COL_LENGTH('dbo.exam',N'수험번호') IS NULL EXEC(N'ALTER TABLE dbo.exam ADD 수험번호 INT NULL');\nGO\nUPDATE a SET 수험번호=(SELECT MIN(b.수험번호) FROM dbo.exam_emp b WHERE b.성명=a.성명) FROM dbo.exam a;",
  );
  assert.ok(
    (await engine.schema("campus"))
      .find((t) => t.name === "exam")
      .columns.some((c) => c.name === "수험번호"),
  );
});
test("server-only features report a clear limitation and data remains isolated per visitor", async () => {
  const engine = workspace(),
    other = workspace();
  await successful(engine, "company", "DELETE FROM EMP;");
  assert.equal(
    (await successful(other, "company", "SELECT COUNT(*) FROM EMP;"))
      .recordsets[0].rows[0][0],
    14,
  );
  const result = await engine.query(
    "company",
    "CREATE OR ALTER PROCEDURE dbo.p AS SELECT 1;",
  );
  assert.equal(result.error?.code, "EBROWSER_UNSUPPORTED");
  assert.match(result.error.message, /SQL Server/);
  assert.equal(
    compileTokens(tokenize("SELECT 'dbo.EMP N''김'';TOP' AS text;")),
    "SELECT 'dbo.EMP N''김'';TOP' AS text",
  );
});

test("every curriculum answer runs or has an explicit SQL Server requirement", async () => {
  for (const lesson of lessons) {
    const result = await workspace().query(
      lesson.database,
      [lesson.setup, lesson.answer].filter(Boolean).join("\nGO\n"),
    );
    if (browserLessonLimits[lesson.id])
      assert.equal(result.error?.code, "EBROWSER_UNSUPPORTED", lesson.id);
    else
      assert.equal(
        result.error,
        null,
        `${lesson.id}: ${result.error?.message}`,
      );
  }
});
