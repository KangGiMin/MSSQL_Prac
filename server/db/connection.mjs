import { connectionLimits } from "../config/limits.mjs";
import { studentSessionSql } from "./statements.mjs";
import { config } from "../config/env.mjs";

// node-mssql drivers share base classes; load exactly one driver per process.
export const sql = (
  await import(config.auth === "sql" ? "mssql" : "mssql/msnodesqlv8.js")
).default;
export async function connect(
  database,
  { admin = false, timeout = config.timeout, keepAlive = false } = {},
) {
  const common = {
    database,
    connectionTimeout: Math.min(connectionLimits.connectMs, timeout),
    requestTimeout: timeout,
    pool: {
      min: keepAlive ? 1 : 0,
      max: 1,
      idleTimeoutMillis: connectionLimits.idleMs,
    },
  };
  let options;
  if (config.auth === "sql") {
    options = {
      ...common,
      server: config.server,
      user: config.user,
      password: config.password,
      options: {
        encrypt: config.encrypt,
        trustServerCertificate: config.trustCertificate,
      },
    };
  } else {
    const escape = (value) => `{${String(value).replaceAll("}", "}}")}}`;
    options = {
      ...common,
      connectionString: `Driver=${escape(config.driver)};Server=${escape(config.server)};Database=${escape(database)};Trusted_Connection=Yes;Encrypt=${config.encrypt ? "Yes" : "No"};TrustServerCertificate=${config.trustCertificate ? "Yes" : "No"};`,
    };
  }
  const pool = await new sql.ConnectionPool(options).connect();
  try {
    if (!admin) await pool.request().batch(studentSessionSql);
    return pool;
  } catch (error) {
    await pool.close();
    throw error;
  }
}
