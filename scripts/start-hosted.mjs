import "dotenv/config";
import fs from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { createAccessControl } from "../server/middleware/access.mjs";
import { config } from "../server/config/env.mjs";
import { describeError } from "../server/services/errors.mjs";

try {
  if (process.env.DEPLOYMENT_MODE !== "hosted")
    throw new Error("배포 시작 명령에는 DEPLOYMENT_MODE=hosted가 필요합니다.");
  createAccessControl();
  if (config.auth !== "sql" || !config.user || !config.password)
    throw new Error(
      "외부 SQL Server의 SQL_AUTH, SQL_USER, SQL_PASSWORD를 지정하세요.",
    );
  if (!fs.existsSync(new URL("../dist/index.html", import.meta.url)))
    throw new Error("빌드 결과가 없습니다. npm run build를 먼저 실행하세요.");

  const { setupDatabases } = await import("../server/db/seed.mjs");
  const deadline = Date.now() + 240_000;
  while (true) {
    try {
      console.log("실습 DB 확인:", await setupDatabases());
      break;
    } catch (error) {
      const number = error.number || error.originalError?.info?.number;
      const transient =
        ["ESOCKET", "ETIMEOUT", "ECONNCLOSED"].includes(error.code) ||
        [40197, 40501, 40613, 49918, 49919, 49920].includes(number);
      if (!transient || Date.now() >= deadline) throw error;
      console.log("SQL 서버가 준비되는 동안 연결을 다시 시도합니다.");
      await delay(3000);
    }
  }
  await import("../server/index.mjs");
} catch (error) {
  console.error("배포 서버 시작 실패:", describeError(error));
  process.exitCode = 1;
}
