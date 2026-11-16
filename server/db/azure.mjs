import { databaseMarkers } from "../config/sql.mjs";
import { readMarkersSql, markOwnedSql } from "./statements.mjs";
// Azure databases must be provisioned using the free-tier resource template.
// Never issue CREATE DATABASE here: a plain SQL command can create a billable DB.
export async function prepareAzureDatabase(
  pool,
  database,
  { reset = false } = {},
) {
  const marker = await pool.request().query(readMarkersSql);
  if (!marker.recordset.some((item) => item.name === databaseMarkers.owned)) {
    const objects = await pool
      .request()
      .query("SELECT TOP (1) name FROM sys.objects WHERE is_ms_shipped=0;");
    if (objects.recordset.length)
      throw new Error(
        `${database}: 앱 소유 표시가 없는 기존 객체가 있어 자동 변경을 중단합니다.`,
      );
    await pool.request().batch(markOwnedSql);
  }
  return (
    !reset &&
    marker.recordset.some((item) => item.name === databaseMarkers.ready)
  );
}
