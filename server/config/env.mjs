import "dotenv/config";
export const config = {
  host:
    process.env.HOST ||
    (process.env.DEPLOYMENT_MODE === "hosted" ? "0.0.0.0" : "127.0.0.1"),
  port: Number(process.env.PORT || 3001),
  server: process.env.SQL_SERVER || "localhost",
  driver: process.env.SQL_DRIVER || "ODBC Driver 17 for SQL Server",
  auth: process.env.SQL_AUTH || "windows",
  platform: process.env.SQL_PLATFORM || "sqlserver",
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  encrypt: process.env.SQL_ENCRYPT === "true",
  trustCertificate: process.env.SQL_TRUST_CERTIFICATE !== "false",
  timeout: Math.min(
    60000,
    Math.max(1000, Number(process.env.QUERY_TIMEOUT_MS) || 15000),
  ),
  maxRows: Math.min(
    5000,
    Math.max(1, Number(process.env.MAX_RESULT_ROWS) || 1000),
  ),
  maxBytes:
    Math.min(32, Math.max(1, Number(process.env.MAX_RESULT_MB) || 8)) *
    1024 *
    1024,
  maxColumns: 256,
};
if (!["windows", "sql"].includes(config.auth))
  throw new Error("SQL_AUTH는 windows 또는 sql이어야 합니다.");
if (!["sqlserver", "azure"].includes(config.platform))
  throw new Error("SQL_PLATFORM은 sqlserver 또는 azure여야 합니다.");
if (
  config.platform === "azure" &&
  (config.auth !== "sql" || !config.encrypt || config.trustCertificate)
)
  throw new Error(
    "Azure SQL에는 SQL_AUTH=sql, SQL_ENCRYPT=true, SQL_TRUST_CERTIFICATE=false가 필요합니다.",
  );
if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535)
  throw new Error("PORT는 1~65535 사이의 정수여야 합니다.");
