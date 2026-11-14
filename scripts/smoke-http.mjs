import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3001";
let checks = 0;
async function get(path) {
  const r = await fetch(base + path);
  assert.equal(r.status, 200, path);
  checks++;
  return r;
}
const html = await (await get("/")).text();
assert.match(html, /QueryGround/);
assert.match(html, /type="module"/);
const asset = html.match(/src="([^"]+\.jsx?(?:\?[^"]*)?)"/)?.[1];
assert.ok(asset);
await get(asset);
const health = await (await get("/api/health")).json();
assert.equal(health.ok, true);
assert.equal(health.principal, "QueryGroundStudent");
const dbs = await (await get("/api/databases")).json();
assert.equal(dbs.length, 3);
for (const db of dbs)
  assert.ok(
    (await (await get(`/api/databases/${db.id}/schema`)).json()).length,
  );
const curriculum = await (await get("/api/curriculum")).json();
assert.equal(curriculum.lessons.length, 71);
const pages = await (await get("/materials/pages.json")).json();
assert.equal(pages.length, 90);
await get("/materials/sql-reference.pdf");
async function post(path, body, headers = {}) {
  return fetch(base + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}
let r = await post("/api/query", {
  database: "campus",
  sql: "SELECT TOP (3) 성명,영어 FROM dbo.exam ORDER BY 영어 DESC;",
});
assert.equal(r.status, 200);
let output = await r.json();
assert.equal(output.error, null);
assert.equal(output.recordsets[0].rows.length, 3);
checks++;
r = await post("/api/query", {
  database: "company",
  sql: "SELECT USER_NAME(),IS_SRVROLEMEMBER('sysadmin');",
});
output = await r.json();
assert.deepEqual(output.recordsets[0].rows[0], ["QueryGroundStudent", 0]);
checks++;
r = await post("/api/query", {
  database: "campus",
  sql: "SELECT * FROM not_a_table;",
});
output = await r.json();
assert.ok(output.error?.number);
checks++;
r = await post("/api/query", { database: "kgm", sql: "SELECT 1;" });
assert.equal(r.status, 400);
checks++;
r = await post(
  "/api/query",
  { database: "company", sql: "SELECT 1;" },
  { Origin: "https://untrusted.example" },
);
assert.equal(r.status, 403);
checks++;
r = await fetch(base + "/api/query", { method: "POST", body: "text/plain" });
assert.equal(r.status, 415);
checks++;
r = await post("/api/databases/campus/reset", { confirm: "company" });
assert.equal(r.status, 400);
checks++;
console.log(
  `HTTP smoke: ${checks} checks passed · health / assets / schema / 71 lessons / 90 PDF pages / query / errors / origin / reset validation`,
);
