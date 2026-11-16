import { studentUser, databaseMarkers } from "../config/sql.mjs";
import { connectionLimits } from "../config/limits.mjs";

export const readMarkersSql = `SELECT name,value FROM sys.extended_properties WHERE class=0 AND name IN ('${databaseMarkers.owned}','${databaseMarkers.ready}')`;

export const markOwnedSql = `EXEC sys.sp_addextendedproperty @name=N'${databaseMarkers.owned}', @value=N'1';`;

export const studentSessionSql = `EXECUTE AS USER = '${studentUser}' WITH NO REVERT; SET NOCOUNT OFF; SET LOCK_TIMEOUT ${connectionLimits.lockMs};`;

export const dropObjects = `
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

export const studentSetupSql = `
        IF DATABASE_PRINCIPAL_ID(N'${studentUser}') IS NULL CREATE USER [${studentUser}] WITHOUT LOGIN WITH DEFAULT_SCHEMA=dbo;
        ALTER ROLE db_datareader ADD MEMBER [${studentUser}];
        ALTER ROLE db_datawriter ADD MEMBER [${studentUser}];
        GRANT CREATE TABLE, CREATE VIEW, CREATE PROCEDURE, CREATE FUNCTION, CREATE TYPE, CREATE SYNONYM, SHOWPLAN, VIEW DEFINITION TO [${studentUser}];
        GRANT ALTER, EXECUTE, REFERENCES ON SCHEMA::dbo TO [${studentUser}];
        IF NOT EXISTS (SELECT 1 FROM sys.extended_properties WHERE class=0 AND name=N'${databaseMarkers.ready}')
          EXEC sys.sp_addextendedproperty @name=N'${databaseMarkers.ready}', @value=N'1';
`;

export const schemaSql = `
      SELECT s.name AS schemaName, t.name AS tableName, t.type_desc AS objectType,
        c.name AS columnName, c.column_id AS columnId, ty.name AS dataType, c.max_length AS maxLength,
        c.precision, c.scale, ty.is_user_defined AS userDefined, SCHEMA_NAME(ty.schema_id) AS typeSchema,
        c.is_nullable AS nullable, c.is_identity AS isIdentity,
        CAST(CASE WHEN pk.column_id IS NULL THEN 0 ELSE 1 END AS bit) AS isPrimaryKey,
        dc.definition AS defaultValue,
        (SELECT STRING_AGG(CONVERT(NVARCHAR(MAX), cc.definition),N'; ') FROM sys.check_constraints cc
          WHERE cc.parent_object_id=t.object_id AND (cc.parent_column_id=c.column_id OR cc.parent_column_id=0)) AS checks
      FROM sys.objects t
      JOIN sys.schemas s ON s.schema_id = t.schema_id
      JOIN sys.columns c ON c.object_id = t.object_id
      JOIN sys.types ty ON ty.user_type_id = c.user_type_id
      LEFT JOIN (SELECT ic.object_id, ic.column_id FROM sys.indexes i JOIN sys.index_columns ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id WHERE i.is_primary_key=1) pk ON pk.object_id=t.object_id AND pk.column_id=c.column_id
      LEFT JOIN sys.default_constraints dc ON dc.object_id=c.default_object_id
      WHERE t.type IN ('U','V') AND t.is_ms_shipped=0
      ORDER BY s.name, t.name, c.column_id;
      SELECT t.name AS tableName, s.name AS schemaName, SUM(p.rows) AS [rowCount]
      FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id
      JOIN sys.partitions p ON p.object_id=t.object_id AND p.index_id IN (0,1)
      GROUP BY t.name,s.name;
      SELECT OBJECT_SCHEMA_NAME(f.parent_object_id) AS schemaName, OBJECT_NAME(f.parent_object_id) AS tableName,
        f.parent_column_id AS columnId, fk.name, OBJECT_SCHEMA_NAME(f.referenced_object_id) AS targetSchema,
        OBJECT_NAME(f.referenced_object_id) AS targetTable, COL_NAME(f.referenced_object_id,f.referenced_column_id) AS targetColumn,
        fk.delete_referential_action_desc AS onDelete, fk.update_referential_action_desc AS onUpdate
      FROM sys.foreign_key_columns f JOIN sys.foreign_keys fk ON fk.object_id=f.constraint_object_id;`;
