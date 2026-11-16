import "dotenv/config";
import { network, isValidPort } from "../../shared/runtime.mjs";
import { queryLimits, boundedNumber, mebibyte } from "./limits.mjs";
export const config = {
  host:
    process.env.HOST ||
    (process.env.DEPLOYMENT_MODE === "hosted" ? "0.0.0.0" : network.host),
  port: Number(process.env.PORT || network.apiPort),
  server: process.env.SQL_SERVER || "localhost",
  driver: process.env.SQL_DRIVER || "ODBC Driver 17 for SQL Server",
  auth: process.env.SQL_AUTH || "windows",
  platform: process.env.SQL_PLATFORM || "sqlserver",
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  encrypt: process.env.SQL_ENCRYPT === "true",
  trustCertificate: process.env.SQL_TRUST_CERTIFICATE !== "false",
  timeout: boundedNumber(process.env.QUERY_TIMEOUT_MS, queryLimits.timeout),
  maxRows: boundedNumber(process.env.MAX_RESULT_ROWS, queryLimits.rows),
  maxBytes:
    boundedNumber(process.env.MAX_RESULT_MB, queryLimits.megabytes) * mebibyte,
  maxColumns: queryLimits.columns,
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
if (!isValidPort(config.port))
  throw new Error("PORT는 1~65535 사이의 정수여야 합니다.");
