import { Router } from "express";
import { databases, getDatabase } from "../config/databases.mjs";
import { getSchema } from "../services/schema-service.mjs";
import { executeQuery, busyDatabases } from "../services/query-service.mjs";
import { seedDatabase, setupDatabases } from "../db/seed.mjs";
import { lessons, sourceCoverage } from "../../shared/curriculum.mjs";
import { connect } from "../db/connection.mjs";
import { describeError } from "../services/errors.mjs";

export const api = Router();
api.get("/health", async (req, res) => {
  const selected = req.query.database
    ? [getDatabase(req.query.database)]
    : databases;
  const states = await Promise.all(
    selected.map(async (db) => {
      let pool;
      try {
        pool = await connect(db.name);
        const result = await pool
          .request()
          .query(
            "SELECT CAST(SERVERPROPERTY('ProductVersion') AS VARCHAR(30)) AS version, USER_NAME() AS principal",
          );
        return {
          id: db.id,
          ok: true,
          busy: busyDatabases.has(db.name),
          ...result.recordset[0],
        };
      } catch (error) {
        return { id: db.id, ok: false, error: describeError(error) };
      } finally {
        if (pool) await pool.close();
      }
    }),
  );
  const failed = states.find((state) => !state.ok);
  res.status(failed ? 503 : 200).json({
    engine: "Microsoft SQL Server",
    ...states[0],
    ok: !failed,
    databases: states,
    ...(failed ? { error: failed.error } : {}),
  });
});
api.post("/setup", async (req, res) => {
  if (req.body?.confirm !== "setup")
    return res.status(400).json({ error: "DB 준비 확인 값이 필요합니다." });
  res.json({ databases: await setupDatabases() });
});
api.get("/databases", (_req, res) => res.json(databases));
api.get("/curriculum", (_req, res) => res.json({ lessons, sourceCoverage }));
api.get("/databases/:id/schema", async (req, res) =>
  res.json(await getSchema(getDatabase(req.params.id).name)),
);
api.post("/query", async (req, res) => {
  const controller = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded) controller.abort();
  });
  const result = await executeQuery(
    getDatabase(req.body.database).name,
    req.body.sql,
    controller.signal,
  );
  res.json(result);
});
api.post("/databases/:id/reset", async (req, res) => {
  if (req.body.confirm !== req.params.id)
    return res
      .status(400)
      .json({ error: "초기화할 데이터베이스 확인 값이 필요합니다." });
  res.json(await seedDatabase(req.params.id, { reset: true }));
});
