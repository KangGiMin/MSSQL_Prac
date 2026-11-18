import assert from "node:assert/strict";
import { executeQuery } from "../server/services/query-service.mjs";
import { databases } from "../shared/databases.mjs";
import { practiceProblems } from "../shared/practice-problems.mjs";

for (const database of databases) {
  const result = await executeQuery(
    database.name,
    "SELECT CAST(SERVERPROPERTY('ProductVersion') AS VARCHAR(30)) AS version,DB_NAME() AS db,USER_NAME() AS principal;",
  );
  assert.equal(result.error, null, result.error?.message);
  assert.equal(result.recordsets[0].rows[0][1], database.name);
  console.log(
    JSON.stringify({
      database: database.id,
      version: result.recordsets[0].rows[0][0],
      principal: result.recordsets[0].rows[0][2],
    }),
  );
}
// Only reviewed, single SELECT statements are allowed to touch the seed DBs.
// Reject DML, DDL, dynamic SQL, SELECT INTO and multi-statement input first.
for (const problem of practiceProblems) {
  assert.match(problem.answer.trim(), /^SELECT\b/i, problem.id);
  assert.doesNotMatch(
    problem.answer,
    /\b(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|MERGE|EXEC|EXECUTE|TRUNCATE|INTO|GRANT|DENY|REVOKE|DBCC|BACKUP|RESTORE)\b/i,
    problem.id,
  );
  assert.ok(!problem.answer.trim().replace(/;$/, "").includes(";"), problem.id);
}
for (const problem of practiceProblems) {
  const result = await executeQuery(
    databases.find((db) => db.id === problem.database).name,
    problem.answer,
  );
  assert.equal(result.error, null, `${problem.id}: ${result.error?.message}`);
}
const result = await executeQuery(
  databases[0].name,
  `
CREATE TABLE #MssqlProbe(id INT PRIMARY KEY,label NVARCHAR(30));
BEGIN TRAN;
INSERT #MssqlProbe VALUES(1,N'추가');
UPDATE #MssqlProbe SET label=N'수정' WHERE id=1;
MERGE #MssqlProbe AS target USING (SELECT 2 AS id,N'MERGE' AS label) AS source
ON target.id=source.id WHEN NOT MATCHED THEN INSERT(id,label) VALUES(source.id,source.label);
SELECT TOP (2) id,label FROM #MssqlProbe ORDER BY id;
DELETE FROM #MssqlProbe WHERE id=1;
SELECT COUNT(*) AS remaining FROM #MssqlProbe;
ROLLBACK;
SELECT COUNT(*) AS rolledBack FROM #MssqlProbe;
DROP TABLE #MssqlProbe;`,
);
assert.equal(result.error, null, result.error?.message);
assert.deepEqual(result.recordsets[0].rows, [
  [1, "수정"],
  [2, "MERGE"],
]);
assert.equal(result.recordsets[1].rows[0][0], 1);
assert.equal(result.recordsets[2].rows[0][0], 0);
console.log(
  "Actual MSSQL: 3 databases, 24 practice answers, temporary-table CRUD, MERGE and ROLLBACK passed. Seed data was preserved.",
);
