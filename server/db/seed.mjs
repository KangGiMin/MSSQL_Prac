import fs from "node:fs/promises";
import { config } from "../config/env.mjs";
import { prepareAzureDatabase } from "./azure.mjs";
import { connect } from "./connection.mjs";
import { databases, getDatabase } from "../config/databases.mjs";
import { exclusive } from "../services/query-service.mjs";

const dropObjects = `
DECLARE @drop NVARCHAR(MAX)=N'';
SELECT @drop+=N'DROP TRIGGER '+QUOTENAME(name)+N' ON DATABASE;' FROM sys.triggers WHERE parent_class=0 AND is_ms_shipped=0;
EXEC sp_executesql @drop;
SET @drop=N'';
SELECT @drop+=N'ALTER TABLE '+QUOTENAME(SCHEMA_NAME(schema_id))+N'.'+QUOTENAME(name)+N' SET (SYSTEM_VERSIONING=OFF);' FROM sys.tables WHERE temporal_type=2;
EXEC sp_executesql @drop;
SET @drop=N'';
SELECT @drop+=N'ALTER TABLE '+QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id))+N'.'+QUOTENAME(OBJECT_NAME(parent_object_id))+N' DROP CONSTRAINT '+QUOTENAME(name)+N';' FROM sys.foreign_keys;
EXEC sp_executesql @drop;
DECLARE @objects TABLE(id INT,command NVARCHAR(MAX));
INSERT @objects SELECT object_id,N'DROP '+CASE type WHEN 'V' THEN N'VIEW ' WHEN 'P' THEN N'PROCEDURE ' ELSE N'FUNCTION ' END+QUOTENAME(SCHEMA_NAME(schema_id))+N'.'+QUOTENAME(name)+N';' FROM sys.objects WHERE type IN ('V','P','FN','IF','TF') AND is_ms_shipped=0;
DECLARE @id INT;
WHILE EXISTS(SELECT 1 FROM @objects)
BEGIN
 SET @id=NULL;
 SELECT TOP(1) @id=o.id,@drop=o.command FROM @objects o WHERE NOT EXISTS(
  SELECT 1 FROM sys.sql_expression_dependencies d JOIN @objects dep ON dep.id=d.referencing_id
  WHERE d.referenced_id=o.id AND d.is_schema_bound_reference=1 AND d.referencing_id<>o.id);
 IF @id IS NULL THROW 51000,N'스키마 바인딩 객체의 의존성을 정리한 후 다시 초기화해 주세요.',1;
 EXEC sp_executesql @drop;
 DELETE FROM @objects WHERE id=@id;
END;
SET @drop=N'';
SELECT @drop+=N'DROP TABLE '+QUOTENAME(SCHEMA_NAME(schema_id))+N'.'+QUOTENAME(name)+N';' FROM sys.tables WHERE is_ms_shipped=0;
EXEC sp_executesql @drop;
SET @drop=N'';
SELECT @drop+=N'DROP SYNONYM '+QUOTENAME(SCHEMA_NAME(schema_id))+N'.'+QUOTENAME(name)+N';' FROM sys.synonyms;
SELECT @drop+=N'DROP SEQUENCE '+QUOTENAME(SCHEMA_NAME(schema_id))+N'.'+QUOTENAME(name)+N';' FROM sys.sequences;
EXEC sp_executesql @drop;
SET @drop=N'';
DECLARE @types TABLE(id INT, command NVARCHAR(MAX));
INSERT @types SELECT user_type_id,N'DROP TYPE '+QUOTENAME(SCHEMA_NAME(schema_id))+N'.'+QUOTENAME(name)+N';' FROM sys.types WHERE is_user_defined=1 AND is_assembly_type=0;
WHILE EXISTS(SELECT 1 FROM @types)
BEGIN
 SET @id=NULL;
 SELECT TOP(1) @id=t.id,@drop=t.command FROM @types t WHERE NOT EXISTS(
   SELECT 1 FROM sys.table_types tt JOIN sys.columns c ON c.object_id=tt.type_table_object_id
   JOIN @types dep ON dep.id=tt.user_type_id WHERE c.user_type_id=t.id AND tt.user_type_id<>t.id);
 IF @id IS NULL THROW 51000,N'사용자 정의 타입의 의존성을 정리한 후 다시 초기화해 주세요.',1;
 EXEC sp_executesql @drop; DELETE @types WHERE id=@id;
END;
SET @drop=N'';
SELECT @drop+=N'DROP SCHEMA '+QUOTENAME(name)+N';' FROM sys.schemas
WHERE name NOT IN ('dbo','guest','sys','INFORMATION_SCHEMA')
 AND name NOT IN (SELECT name FROM sys.database_principals WHERE type='R' AND is_fixed_role=1);
EXEC sp_executesql @drop;`;

export async function seedDatabase(id, { reset = false } = {}) {
  const db = getDatabase(id);
  return exclusive(db.name, async () => {
    if (config.platform === "azure") {
      const existing = await connect(db.name, { admin: true });
      try {
        if (await prepareAzureDatabase(existing, db.name, { reset }))
          return { skipped: true, database: db.name };
      } finally {
        await existing.close();
      }
    } else {
      const master = await connect("master", { admin: true });
      try {
        const found = await master
          .request()
          .query(`SELECT name FROM sys.databases WHERE name=N'${db.name}';`);
        if (found.recordset.length) {
          const existing = await connect(db.name, { admin: true });
          try {
            const marker = await existing
              .request()
              .query(
                "SELECT name,value FROM sys.extended_properties WHERE class=0 AND name IN ('QueryGroundOwned','QueryGroundReady')",
              );
            if (!marker.recordset.some((x) => x.name === "QueryGroundOwned"))
              throw new Error(
                `${db.name}: 앱 소유 표시가 없는 동명 DB입니다. 자동 변경을 중단합니다.`,
              );
            if (
              !reset &&
              marker.recordset.some((x) => x.name === "QueryGroundReady")
            )
              return { skipped: true, database: db.name };
          } finally {
            await existing.close();
          }
        } else {
          await master.request().batch(`CREATE DATABASE [${db.name}];`);
          const created = await connect(db.name, { admin: true });
          try {
            await created
              .request()
              .batch(
                "EXEC sys.sp_addextendedproperty @name=N'QueryGroundOwned', @value=N'1';",
              );
          } finally {
            await created.close();
          }
        }
        await master
          .request()
          .batch(
            `ALTER DATABASE [${db.name}] SET TRUSTWORTHY OFF; ALTER DATABASE [${db.name}] SET DB_CHAINING OFF;`,
          );
      } finally {
        await master.close();
      }
    }
    const pool = await connect(db.name, { admin: true });
    try {
      // Only the three hard-coded QueryGround databases can reach this reset path.
      const seed = await fs.readFile(
        new URL(`../../database/seeds/${id}.sql`, import.meta.url),
        "utf8",
      );
      await pool
        .request()
        .batch(
          `SET XACT_ABORT ON; BEGIN TRAN; BEGIN TRY\n${dropObjects}\nEXEC sys.sp_executesql N'${seed.replaceAll("'", "''")}';\nCOMMIT; END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK; THROW; END CATCH;`,
        );
      await pool.request().batch(`
        IF DATABASE_PRINCIPAL_ID(N'QueryGroundStudent') IS NULL CREATE USER [QueryGroundStudent] WITHOUT LOGIN WITH DEFAULT_SCHEMA=dbo;
        ALTER ROLE db_datareader ADD MEMBER [QueryGroundStudent];
        ALTER ROLE db_datawriter ADD MEMBER [QueryGroundStudent];
        GRANT CREATE TABLE, CREATE VIEW, CREATE PROCEDURE, CREATE FUNCTION, CREATE TYPE, CREATE SYNONYM, SHOWPLAN, VIEW DEFINITION TO [QueryGroundStudent];
        GRANT ALTER, EXECUTE, REFERENCES ON SCHEMA::dbo TO [QueryGroundStudent];
        IF NOT EXISTS (SELECT 1 FROM sys.extended_properties WHERE class=0 AND name=N'QueryGroundReady')
          EXEC sys.sp_addextendedproperty @name=N'QueryGroundReady', @value=N'1';
      `);
      return { skipped: false, database: db.name };
    } finally {
      await pool.close();
    }
  });
}
export async function setupDatabases() {
  const results = [];
  for (const db of databases) results.push(await seedDatabase(db.id));
  return results;
}
