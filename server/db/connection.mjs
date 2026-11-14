import { config } from '../config/env.mjs';

// node-mssql drivers share base classes; load exactly one driver per process.
export const sql = (await import(config.auth === 'sql' ? 'mssql' : 'mssql/msnodesqlv8.js')).default;
export async function connect(database, { admin = false } = {}) {
  const common = { database, connectionTimeout: 8000, requestTimeout: config.timeout, pool: { min: 0, max: 1, idleTimeoutMillis: 1000 } };
  let options;
  if (config.auth === 'sql') {
    options = { ...common, server: config.server, user: config.user, password: config.password,
      options: { encrypt: config.encrypt, trustServerCertificate: config.trustCertificate } };
  } else {
    const escape = value => `{${String(value).replaceAll('}', '}}')}}`;
    options = { ...common, connectionString: `Driver=${escape(config.driver)};Server=${escape(config.server)};Database=${escape(database)};Trusted_Connection=Yes;Encrypt=${config.encrypt ? 'Yes' : 'No'};TrustServerCertificate=${config.trustCertificate ? 'Yes' : 'No'};` };
  }
  const pool = await new sql.ConnectionPool(options).connect();
  try {
    if (!admin) await pool.request().batch("EXECUTE AS USER = 'QueryGroundStudent' WITH NO REVERT; SET NOCOUNT OFF; SET LOCK_TIMEOUT 5000;");
    return pool;
  } catch (error) { await pool.close(); throw error; }
}
