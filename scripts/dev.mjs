import { spawn } from "node:child_process";
import { watch, existsSync } from "node:fs";
import { describeError } from "../server/services/errors.mjs";
const childEnv = { ...process.env };
const { setupDatabases } = await import("../server/db/seed.mjs");
try {
  console.log("실습 DB 확인:", await setupDatabases());
} catch (error) {
  console.error("DB 준비 실패:", describeError(error));
  process.exit(1);
}
const children = new Set(),
  watchers = [];
let stopping = false;
let api, restartTimer;
const restarting = new WeakSet();
const stop = (code = 0) => {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  clearTimeout(restartTimer);
  for (const watcher of watchers) watcher.close();
  for (const child of children) if (child.exitCode === null) child.kill();
};
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
function start(args, isApi = false) {
  const child = spawn(process.execPath, args, {
    stdio: "inherit",
    windowsHide: true,
    env: childEnv,
  });
  children.add(child);
  child.on("error", (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on("exit", (code, signal) => {
    children.delete(child);
    if (!stopping && isApi && restarting.has(child)) {
      api = start(["server/index.mjs"], true);
      return;
    }
    if (!stopping) stop(code || (signal ? 1 : 0));
  });
  return child;
}
api = start(["server/index.mjs"], true);
start(["node_modules/vite/bin/vite.js", "--host", "127.0.0.1"]);
const restart = () => {
  clearTimeout(restartTimer);
  restartTimer = setTimeout(() => {
    if (!stopping && api.exitCode === null && !restarting.has(api)) {
      restarting.add(api);
      api.kill();
    }
  }, 200);
};
for (const directory of ["server", "shared"])
  watchers.push(watch(directory, { recursive: true }, restart));
for (const file of [".env"])
  if (existsSync(file)) watchers.push(watch(file, restart));
