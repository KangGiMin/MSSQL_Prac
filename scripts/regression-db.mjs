import assert from "node:assert/strict";
import { executeQuery } from "../server/services/query-service.mjs";
import { seedDatabase } from "../server/db/seed.mjs";
import { getSchema } from "../server/services/schema-service.mjs";
import { connect } from "../server/db/connection.mjs";
import { config } from "../server/config/env.mjs";
const database = "QueryGround_Company";
try {
  await seedDatabase("company", { reset: true });
  let r = await executeQuery(
    database,
    "SELECT TOP(1) EMPNO,ENAME FROM dbo.EMP FOR JSON PATH; SELECT EMPNO FROM dbo.EMP FOR XML PATH('emp');",
  );
  assert.equal(r.error, null);
  assert.equal(JSON.parse(r.recordsets[0].rows[0][0])[0].EMPNO, 1001);
  assert.match(r.recordsets[1].rows[0][0], /<emp>/);
  console.log("PASS complete JSON/XML result values");
  r = await executeQuery(
    database,
    "SELECT REPLICATE(CAST(N'x' AS NVARCHAR(MAX)),30000) AS longText FOR JSON PATH; SELECT CONVERT(VARBINARY(MAX),REPLICATE(CAST('x' AS VARCHAR(MAX)),30000)) AS bytes;",
  );
  assert.equal(r.error, null);
  assert.equal(
    JSON.parse(r.recordsets[0].rows[0][0])[0].longText.length,
    30000,
  );
  assert.equal(r.recordsets[1].rows[0][0].length, 60002);
  console.log(
    "PASS long JSON and binary values are preserved without cell truncation",
  );
  const previousLimit = config.maxBytes;
  config.maxBytes = 1024 * 1024;
  try {
    r = await executeQuery(
      database,
      "SELECT TOP (100) REPLICATE(CAST(N'x' AS NVARCHAR(MAX)),20000) AS longText FROM sys.all_objects;",
    );
    assert.equal(r.error, null);
    assert.equal(r.recordsets[0].totalRows, 100);
    assert.ok(r.recordsets[0].rows.length < 100);
    assert.equal(r.recordsets[0].limitReason, "bytes");
    assert.ok(Buffer.byteLength(JSON.stringify(r)) < config.maxBytes + 20000);
  } finally {
    config.maxBytes = previousLimit;
  }
  console.log(
    "PASS result byte budget caps retained data without rewriting the query",
  );
  r = await executeQuery(
    database,
    "CREATE TABLE dbo.QgParentA(id INT PRIMARY KEY); CREATE TABLE dbo.QgParentB(id INT PRIMARY KEY); CREATE TABLE dbo.QgChild(id INT REFERENCES dbo.QgParentA(id), CONSTRAINT QgSecondFK FOREIGN KEY(id) REFERENCES dbo.QgParentB(id), textValue NVARCHAR(20) DEFAULT N'hello', amount DECIMAL(12,2) CHECK(amount>=0));",
  );
  assert.equal(r.error, null, r.error?.message);
  const child = (await getSchema(database)).find(
    (table) => table.name === "QgChild",
  );
  assert.equal(child.columns.length, 3);
  assert.equal(child.columns[0].references.length, 2);
  assert.equal(child.columns[1].type, "nvarchar(20)");
  assert.match(child.columns[1].defaultValue, /hello/);
  assert.equal(child.columns[2].type, "decimal(12,2)");
  assert.ok(child.columns[2].checks);
  console.log(
    "PASS schema retains precise types, defaults, checks and multiple FK targets",
  );
  r = await executeQuery(
    database,
    "CREATE TYPE dbo.QgCode FROM INT;\nGO\nCREATE TYPE dbo.QgRows AS TABLE(code dbo.QgCode);\nGO\nCREATE SEQUENCE dbo.QgSequence AS INT START WITH 1;\nCREATE SYNONYM dbo.QgSynonym FOR dbo.EMP;\nGO\nCREATE VIEW dbo.QgView WITH SCHEMABINDING AS SELECT EMPNO,ENAME FROM dbo.EMP;\nGO\nCREATE VIEW dbo.QgNested WITH SCHEMABINDING AS SELECT EMPNO,ENAME FROM dbo.QgView;\nGO\nSELECT NEXT VALUE FOR dbo.QgSequence;",
  );
  assert.equal(r.error, null, r.error?.message);
  const admin = await connect(database, { admin: true });
  try {
    await admin.request().batch("CREATE SCHEMA QgSandbox;");
    await admin
      .request()
      .batch(
        "CREATE TABLE QgSandbox.EMP(id INT PRIMARY KEY,ValidFrom DATETIME2 GENERATED ALWAYS AS ROW START NOT NULL DEFAULT SYSUTCDATETIME(),ValidTo DATETIME2 GENERATED ALWAYS AS ROW END NOT NULL DEFAULT CONVERT(DATETIME2,'9999-12-31 23:59:59.9999999'),PERIOD FOR SYSTEM_TIME(ValidFrom,ValidTo)) WITH(SYSTEM_VERSIONING=ON(HISTORY_TABLE=QgSandbox.History));",
      );
    await admin
      .request()
      .batch(
        "CREATE TRIGGER QgDatabaseTrigger ON DATABASE FOR CREATE_VIEW AS PRINT N'created';",
      );
  } finally {
    await admin.close();
  }
  await seedDatabase("company", { reset: true });
  assert.equal((await getSchema(database)).length, 4);
  r = await executeQuery(
    database,
    "SELECT COUNT(*) AS n FROM sys.types WHERE is_user_defined=1; SELECT COUNT(*) FROM sys.sequences; SELECT COUNT(*) FROM sys.synonyms;",
  );
  assert.equal(r.error, null);
  for (const rs of r.recordsets) assert.equal(rs.rows[0][0], 0);
  console.log(
    "PASS reset removes schema-bound views, dependent types, temporal tables, custom schemas and DDL triggers",
  );
} finally {
  await seedDatabase("company", { reset: true });
}
