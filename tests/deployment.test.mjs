import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import express from "express";
import { createAccessControl } from "../server/middleware/access.mjs";
import { prepareAzureDatabase } from "../server/db/azure.mjs";

const hosted = {
  DEPLOYMENT_MODE: "hosted",
  PUBLIC_ORIGIN: "https://practice.example",
  APP_USER: "learner",
  APP_PASSWORD: "test-only-long-password",
};
const authorization = `Basic ${Buffer.from(`${hosted.APP_USER}:${hosted.APP_PASSWORD}`).toString("base64")}`;

async function server(t, env) {
  const app = express();
  app.use(createAccessControl(env));
  app.get("/healthz", (_req, res) => res.json({ ok: true }));
  app.all("/{*path}", (_req, res) => res.json({ protected: true }));
  const listener = await new Promise((resolve) => {
    const current = app.listen(0, "127.0.0.1", () => resolve(current));
  });
  t.after(() => new Promise((resolve) => listener.close(resolve)));
  return `http://127.0.0.1:${listener.address().port}`;
}

test("local mode retains loopback and local-origin access", async (t) => {
  const base = await server(t, {});
  assert.equal((await fetch(`${base}/api/query`)).status, 200);
  assert.equal(
    (
      await fetch(`${base}/api/query`, {
        headers: { Origin: "http://127.0.0.1:5173" },
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await fetch(`${base}/api/query`, {
        headers: { Origin: "https://untrusted.example" },
      })
    ).status,
    403,
  );
  let status;
  createAccessControl({})(
    { socket: { remoteAddress: "192.0.2.1" } },
    {
      status(code) {
        status = code;
        return this;
      },
      json() {},
    },
    () => assert.fail("non-local request was accepted"),
  );
  assert.equal(status, 403);
});

test("only the configured Pages origin can preflight and call the hosted MSSQL API", async (t) => {
  const client = "https://kanggimin.github.io";
  const base = await server(t, {
    ...hosted,
    APP_ACCESS: "public",
    PUBLIC_CLIENT_ORIGIN: client,
  });
  const headers = { "X-Forwarded-Proto": "https", Origin: client };
  const preflight = await fetch(base + "/api/query", {
    method: "OPTIONS",
    headers: {
      ...headers,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type",
    },
  });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-origin"), client);
  assert.equal(preflight.headers.get("access-control-allow-credentials"), null);
  assert.match(preflight.headers.get("vary"), /Origin/);
  const response = await fetch(base + "/api/query", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: "{}",
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), client);
  for (const change of [
    {
      Origin: "https://untrusted.example",
      "Access-Control-Request-Method": "POST",
    },
    { "Access-Control-Request-Method": "DELETE" },
    {
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "authorization",
    },
  ])
    assert.equal(
      (
        await fetch(base + "/api/query", {
          method: "OPTIONS",
          headers: { ...headers, ...change },
        })
      ).status,
      403,
    );
  for (const origin of [
    "http://kanggimin.github.io",
    "https://kanggimin.github.io/path",
    "https://user:password@kanggimin.github.io",
    "invalid",
  ])
    assert.throws(() =>
      createAccessControl({ ...hosted, PUBLIC_CLIENT_ORIGIN: origin }),
    );
});

test("hosted mode fails closed without HTTPS origin and strong credentials", () => {
  for (const change of [
    { PUBLIC_ORIGIN: undefined },
    { PUBLIC_ORIGIN: "http://practice.example" },
    { PUBLIC_ORIGIN: "https://practice.example/path" },
    { APP_USER: "user:name" },
    { APP_PASSWORD: "short" },
  ])
    assert.throws(() => createAccessControl({ ...hosted, ...change }));
  assert.throws(() => createAccessControl({ DEPLOYMENT_MODE: "anything" }));
  assert.doesNotThrow(() =>
    createAccessControl({
      ...hosted,
      PUBLIC_ORIGIN: undefined,
      RENDER_EXTERNAL_URL: hosted.PUBLIC_ORIGIN,
    }),
  );
});

test("hosted static files and SQL endpoints require HTTPS and correct credentials", async (t) => {
  const base = await server(t, hosted);
  for (const path of ["/", "/assets/main.js", "/api/query", "/api/health"]) {
    assert.equal((await fetch(base + path)).status, 403);
    const anonymous = await fetch(base + path, {
      headers: { "X-Forwarded-Proto": "https" },
    });
    assert.equal(anonymous.status, 401);
    assert.match(anonymous.headers.get("www-authenticate"), /^Basic /);
    for (const value of [
      "Basic !!!!",
      `Basic ${Buffer.from("learner:wrong").toString("base64")}`,
    ])
      assert.equal(
        (
          await fetch(base + path, {
            headers: { "X-Forwarded-Proto": "https", Authorization: value },
          })
        ).status,
        401,
      );
    const allowed = await fetch(base + path, {
      headers: { "X-Forwarded-Proto": "https", Authorization: authorization },
    });
    assert.equal(allowed.status, 200);
    assert.equal(allowed.headers.get("cache-control"), "private, no-store");
  }
  assert.equal(
    (
      await fetch(`${base}/api/query`, {
        method: "POST",
        headers: {
          "X-Forwarded-Proto": "https",
          Authorization: authorization,
          Origin: "https://untrusted.example",
        },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(`${base}/api/query`, {
        method: "POST",
        headers: {
          "X-Forwarded-Proto": "https",
          Authorization: authorization,
          Origin: hosted.PUBLIC_ORIGIN,
        },
      })
    ).status,
    200,
  );
});

test("only the exact read-only liveness route bypasses hosted authentication", async (t) => {
  const base = await server(t, hosted);
  const health = await fetch(`${base}/healthz`);
  assert.deepEqual(await health.json(), { ok: true });
  for (const path of ["/healthz/", "/healthz/../api/query", "/api/health"]) {
    assert.equal(
      (await fetch(base + path, { headers: { "X-Forwarded-Proto": "https" } }))
        .status,
      401,
    );
  }
  assert.equal(
    (
      await fetch(`${base}/healthz`, {
        method: "POST",
        headers: { "X-Forwarded-Proto": "https" },
      })
    ).status,
    401,
  );
});

test("public hosting accepts visitors without credentials and retains HTTPS and origin checks", async (t) => {
  const base = await server(t, {
    DEPLOYMENT_MODE: "hosted",
    APP_ACCESS: "public",
    PUBLIC_ORIGIN: hosted.PUBLIC_ORIGIN,
  });
  for (const path of [
    "/",
    "/assets/main.js",
    "/api/health",
    "/materials/sql-reference.pdf",
  ]) {
    assert.equal((await fetch(base + path)).status, 403);
    const response = await fetch(base + path, {
      headers: { "X-Forwarded-Proto": "https" },
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("www-authenticate"), null);
  }
  assert.equal(
    (
      await fetch(base + "/api/query", {
        method: "POST",
        headers: {
          "X-Forwarded-Proto": "https",
          Origin: hosted.PUBLIC_ORIGIN,
        },
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await fetch(base + "/api/query", {
        method: "POST",
        headers: {
          "X-Forwarded-Proto": "https",
          Origin: "https://untrusted.example",
        },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(base + "/api/setup", {
        method: "POST",
        headers: {
          "X-Forwarded-Proto": "https",
          Origin: hosted.PUBLIC_ORIGIN,
        },
      })
    ).status,
    403,
  );
});

test("public access requires explicit hosted configuration and a valid HTTPS origin", () => {
  assert.throws(() => createAccessControl({ APP_ACCESS: "public" }));
  assert.throws(() =>
    createAccessControl({ ...hosted, APP_ACCESS: "anything" }),
  );
  assert.throws(() =>
    createAccessControl({ DEPLOYMENT_MODE: "hosted", APP_ACCESS: "public" }),
  );
  assert.throws(() =>
    createAccessControl({
      DEPLOYMENT_MODE: "hosted",
      APP_ACCESS: "public",
      PUBLIC_ORIGIN: "http://practice.example",
    }),
  );
});

function pool(markers, objects = []) {
  const calls = [];
  return {
    calls,
    request: () => ({
      query: async (sql) => {
        calls.push(sql);
        return {
          recordset: sql.includes("extended_properties") ? markers : objects,
        };
      },
      batch: async (sql) => {
        calls.push(sql);
      },
    }),
  };
}

test("Azure setup adopts only an empty reserved DB and never creates or upgrades databases", async () => {
  const empty = pool([]);
  assert.equal(await prepareAzureDatabase(empty, "QueryGround_Campus"), false);
  assert.ok(empty.calls.some((sql) => sql.includes("sp_addextendedproperty")));
  assert.ok(
    empty.calls.every((sql) => !/CREATE DATABASE|ALTER DATABASE/i.test(sql)),
  );
  const occupied = pool([], [{ name: "ExistingTable" }]);
  await assert.rejects(
    prepareAzureDatabase(occupied, "QueryGround_Campus"),
    /QueryGround_Campus/,
  );
  assert.ok(
    occupied.calls.every((sql) => !sql.includes("sp_addextendedproperty")),
  );
});

test("Azure setup preserves ready databases and resets only when explicitly requested", async () => {
  const ready = pool([
    { name: "QueryGroundOwned" },
    { name: "QueryGroundReady" },
  ]);
  assert.equal(await prepareAzureDatabase(ready, "QueryGround_Campus"), true);
  assert.equal(ready.calls.length, 1);
  assert.equal(
    await prepareAzureDatabase(ready, "QueryGround_Campus", { reset: true }),
    false,
  );
  const incomplete = pool([{ name: "QueryGroundOwned" }]);
  assert.equal(
    await prepareAzureDatabase(incomplete, "QueryGround_Campus"),
    false,
  );
});

test("the free database template pauses at its limit and contains only the three practice databases", async () => {
  const template = JSON.parse(
    await fs.readFile(
      new URL("../deploy/azure-free-databases.json", import.meta.url),
      "utf8",
    ),
  );
  assert.deepEqual(template.variables.databases, [
    "QueryGround_Company",
    "QueryGround_Store",
    "QueryGround_Campus",
  ]);
  assert.equal(template.resources.length, 1);
  const db = template.resources[0];
  assert.equal(db.type, "Microsoft.Sql/servers/databases");
  assert.equal(db.copy.count, 3);
  assert.equal(db.properties.useFreeLimit, true);
  assert.equal(db.properties.freeLimitExhaustionBehavior, "AutoPause");
  assert.equal(db.properties.requestedBackupStorageRedundancy, "Local");
});
