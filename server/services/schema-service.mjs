import { schemaSql } from "../db/statements.mjs";
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
    const result = await pool.request().query(schemaSql);
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
