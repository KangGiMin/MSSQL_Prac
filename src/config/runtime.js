export const browserSql = import.meta.env?.VITE_SQL_ENGINE === "browser";
export const engineLabel = browserSql ? "브라우저 SQL" : "SQL Server";
export const assetUrl = (path) =>
  `${import.meta.env?.BASE_URL || "/"}${path.replace(/^\/+/, "")}`;
