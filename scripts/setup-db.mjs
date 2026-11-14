import { setupDatabases } from "../server/db/seed.mjs";
import { describeError } from "../server/services/errors.mjs";
try {
  console.log(await setupDatabases());
} catch (e) {
  console.error("DB 준비 실패:", describeError(e));
  process.exitCode = 1;
}
