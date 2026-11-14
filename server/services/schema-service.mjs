import { connect } from '../db/connection.mjs';

export async function getSchema(database) {
  const pool = await connect(database);
  try {
    const result = await pool.request().query(`
      SELECT s.name AS schemaName, t.name AS tableName, t.type_desc AS objectType,
        c.name AS columnName, ty.name AS dataType, c.max_length AS maxLength,
        c.is_nullable AS nullable, c.is_identity AS isIdentity,
        CAST(CASE WHEN pk.column_id IS NULL THEN 0 ELSE 1 END AS bit) AS isPrimaryKey,
        rt.name AS referencesTable
      FROM sys.objects t
      JOIN sys.schemas s ON s.schema_id = t.schema_id
      JOIN sys.columns c ON c.object_id = t.object_id
      JOIN sys.types ty ON ty.user_type_id = c.user_type_id
      LEFT JOIN (SELECT ic.object_id, ic.column_id FROM sys.indexes i JOIN sys.index_columns ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id WHERE i.is_primary_key=1) pk ON pk.object_id=t.object_id AND pk.column_id=c.column_id
      LEFT JOIN sys.foreign_key_columns fk ON fk.parent_object_id=t.object_id AND fk.parent_column_id=c.column_id
      LEFT JOIN sys.objects rt ON rt.object_id=fk.referenced_object_id
      WHERE t.type IN ('U','V') AND t.is_ms_shipped=0
      ORDER BY s.name, t.name, c.column_id;
      SELECT t.name AS tableName, s.name AS schemaName, SUM(p.rows) AS [rowCount]
      FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id
      JOIN sys.partitions p ON p.object_id=t.object_id AND p.index_id IN (0,1)
      GROUP BY t.name,s.name;`);
    const tables = new Map();
    for (const row of result.recordsets[0]) {
      const key = `${row.schemaName}.${row.tableName}`;
      if (!tables.has(key)) tables.set(key, { schema: row.schemaName, name: row.tableName, type: row.objectType, columns: [], rowCount: result.recordsets[1].find(t => t.tableName === row.tableName && t.schemaName === row.schemaName)?.rowCount || 0 });
      tables.get(key).columns.push({ name: row.columnName, type: row.dataType, nullable: row.nullable, primary: row.isPrimaryKey, identity: row.isIdentity, references: row.referencesTable });
    }
    return [...tables.values()];
  } finally { await pool.close(); }
}
