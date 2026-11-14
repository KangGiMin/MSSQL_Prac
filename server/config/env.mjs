import 'dotenv/config';
export const config = {
  host: process.env.HOST || '127.0.0.1',
  port: Number(process.env.PORT || 3001),
  server: process.env.SQL_SERVER || 'localhost',
  driver: process.env.SQL_DRIVER || 'ODBC Driver 17 for SQL Server',
  auth: process.env.SQL_AUTH || 'windows',
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  encrypt: process.env.SQL_ENCRYPT === 'true',
  trustCertificate: process.env.SQL_TRUST_CERTIFICATE !== 'false',
  timeout: Math.min(60000, Math.max(1000, Number(process.env.QUERY_TIMEOUT_MS) || 15000)),
  maxRows: Math.min(5000, Math.max(1, Number(process.env.MAX_RESULT_ROWS) || 1000)),
};
