import { setupDatabases } from '../server/db/seed.mjs';
try { await setupDatabases(); } catch (e) { console.error('DB 준비 실패:', e.message); process.exitCode = 1; }
