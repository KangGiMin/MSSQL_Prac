import { connect } from "../db/connection.mjs";

export function formatType(row) {
  if (row.userDefined) return `${row.typeSchema}.${row.dataType}`;
  if (
    ["varchar", "nvarchar", "char", "nchar", "binary", "varbinary"].includes(
      row.dataType,
    )
  ) {
    const length =
      row.maxLength === -1
        ? "max"
        : row.maxLength / (row.dataType.startsWith("n") ? 2 : 1);
    return `${row.dataType}(${length})`;
  }
  if (["decimal", "numeric"].includes(row.dataType))
    return `${row.dataType}(${row.precision},${row.scale})`;
  if (["datetime2", "datetimeoffset", "time"].includes(row.dataType))
    return `${row.dataType}(${row.scale})`;
  return row.dataType;
}

export async function getSchema(database) {
  const pool = await connect(database);
  try {
    const result = await pool.request().query(`
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
      FROM sys.foreign_key_columns f JOIN sys.foreign_keys fk ON fk.object_id=f.constraint_object_id;`);
    const tables = new Map();
    for (const row of result.recordsets[0]) {
      const key = `${row.schemaName}.${row.tableName}`;
      if (!tables.has(key))
        tables.set(key, {
          schema: row.schemaName,
          name: row.tableName,
          type: row.objectType,
          columns: [],
          rowCount:
            row.objectType === "VIEW"
              ? null
              : result.recordsets[1].find(
                  (t) =>
                    t.tableName === row.tableName &&
                    t.schemaName === row.schemaName,
                )?.rowCount || 0,
        });
      const references = result.recordsets[2]
        .filter(
          (f) =>
            f.schemaName === row.schemaName &&
            f.tableName === row.tableName &&
            f.columnId === row.columnId,
        )
        .map((f) => ({
          name: f.name,
          schema: f.targetSchema,
          table: f.targetTable,
          column: f.targetColumn,
          onDelete: f.onDelete,
          onUpdate: f.onUpdate,
        }));
      tables.get(key).columns.push({
        name: row.columnName,
        type: formatType(row),
        baseType: row.dataType,
        maxLength: row.maxLength,
        precision: row.precision,
        scale: row.scale,
        nullable: row.nullable,
        primary: row.isPrimaryKey,
        identity: row.isIdentity,
        defaultValue: row.defaultValue,
        checks: row.checks,
        references,
      });
    }
    return [...tables.values()];
  } finally {
    await pool.close();
  }
}
