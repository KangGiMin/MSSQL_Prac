import test from "node:test";
import assert from "node:assert/strict";
import { resolveApiConfig } from "../shared/deployment.mjs";

test("Pages requires an explicit MSSQL backend and local mode retains its same-origin API", () => {
  assert.deepEqual(resolveApiConfig(), { origin: "", configured: true });
  assert.deepEqual(resolveApiConfig({ staticSite: true }), {
    origin: "",
    configured: false,
  });
  assert.deepEqual(
    resolveApiConfig({ staticSite: true, apiBaseUrl: "https://sql.example/" }),
    { origin: "https://sql.example", configured: true },
  );
  for (const apiBaseUrl of [
    "http://sql.example",
    "https://user:password@sql.example",
    "https://sql.example/api",
    "https://sql.example?key=secret",
    "not-a-url",
  ])
    assert.throws(() => resolveApiConfig({ staticSite: true, apiBaseUrl }));
});
