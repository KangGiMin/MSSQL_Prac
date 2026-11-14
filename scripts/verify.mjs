import { spawn } from "node:child_process";
import { config } from "../server/config/env.mjs";
import fs from "node:fs/promises";

const base =
  process.env.TEST_BASE_URL ||
  `http://127.0.0.1:${process.env.CLIENT_PORT || 5173}`;
let development;
async function run(args) {
  const child = spawn(process.execPath, args, {
    stdio: "inherit",
    windowsHide: true,
    env: { ...process.env, TEST_BASE_URL: base },
  });
  const code = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => resolve(code));
  });
  if (code !== 0) throw new Error(`${args.join(" ")} 실패 (${code})`);
}
try {
  try {
    if (!(await fetch(base)).ok) throw new Error("not ready");
  } catch {
    development = spawn(process.execPath, ["scripts/dev.mjs"], {
      stdio: "inherit",
      windowsHide: true,
    });
    let ready = false;
    for (let i = 0; i < 120; i++) {
      if (development.exitCode !== null)
        throw new Error("개발 서버 시작에 실패했습니다.");
      try {
        if ((await fetch(base)).ok) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!ready) throw new Error("개발 서버 준비 시간을 초과했습니다.");
  }
  // These suites share practice DBs and must never reset them in parallel.
  const unitTests = (await fs.readdir("tests"))
    .filter((name) => name.endsWith(".test.mjs"))
    .map((name) => `tests/${name}`);
  await run(["--test", ...unitTests]);
  await run(["scripts/integration-test.mjs"]);
  await run(["scripts/regression-db.mjs"]);
  await run(["scripts/check-ports.mjs"]);
  await run(["node_modules/vite/bin/vite.js", "build"]);
  await run(["scripts/check-render.mjs"]);
  await run(["scripts/smoke-http.mjs"]);
  await run(["node_modules/@playwright/test/cli.js", "test"]);
  console.log(`전체 검증을 통과했습니다. API 포트 ${config.port}.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (development?.exitCode === null) {
    if (process.platform === "win32")
      await new Promise((resolve) =>
        spawn("taskkill", ["/PID", String(development.pid), "/T", "/F"], {
          stdio: "ignore",
          windowsHide: true,
        }).once("exit", resolve),
      );
    else development.kill("SIGTERM");
  }
}
