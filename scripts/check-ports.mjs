import { spawn } from "node:child_process";
import net from "node:net";
import assert from "node:assert/strict";

async function freePorts(count) {
  const servers = await Promise.all(
    Array.from(
      { length: count },
      () =>
        new Promise((resolve, reject) => {
          const server = net.createServer();
          server.once("error", reject);
          server.listen(0, "127.0.0.1", () => resolve(server));
        }),
    ),
  );
  const ports = servers.map((server) => server.address().port);
  await Promise.all(
    servers.map((server) => new Promise((resolve) => server.close(resolve))),
  );
  return ports;
}
async function stop(child) {
  if (child.exitCode !== null) return;
  if (process.platform === "win32")
    await new Promise((resolve) =>
      spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      }).once("exit", resolve),
    );
  else child.kill("SIGTERM");
}
const [apiPort, clientPort, extraPort] = await freePorts(3);
const child = spawn(process.execPath, ["scripts/dev.mjs"], {
  windowsHide: true,
  env: {
    ...process.env,
    PORT: String(apiPort),
    CLIENT_PORT: String(clientPort),
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let output = "";
for (const stream of [child.stdout, child.stderr])
  stream.on("data", (chunk) => {
    output = (output + chunk).slice(-10000);
  });
try {
  const base = `http://127.0.0.1:${clientPort}`;
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(output);
    try {
      if (
        (
          await fetch(`${base}/api/health?database=campus`, {
            signal: AbortSignal.timeout(500),
          })
        ).ok
      ) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  assert.ok(ready, output);
  const response = await fetch(`${base}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      database: "campus",
      sql: "SELECT 717 AS port_test;",
    }),
  });
  const result = await response.json();
  assert.equal(result.error, null);
  assert.equal(result.recordsets[0].rows[0][0], 717);
  console.log(
    "PASS non-default API/client ports route SQL through the configured proxy",
  );
  const conflict = spawn(process.execPath, ["scripts/dev.mjs"], {
    windowsHide: true,
    stdio: "ignore",
    env: {
      ...process.env,
      PORT: String(extraPort),
      CLIENT_PORT: String(clientPort),
    },
  });
  try {
    const code = await Promise.race([
      new Promise((resolve) => conflict.once("exit", resolve)),
      new Promise((_, reject) => {
        const timer = setTimeout(
          () => reject(new Error("Port collision did not exit")),
          15000,
        );
        timer.unref();
      }),
    ]);
    assert.equal(code, 1);
    assert.ok((await fetch(base)).ok);
    console.log(
      "PASS occupied client ports fail explicitly and preserve the existing server",
    );
  } finally {
    await stop(conflict);
  }
} finally {
  await stop(child);
}
