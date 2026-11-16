import { network } from "../shared/runtime.mjs";
import { queryLimits } from "./config/limits.mjs";
import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { config } from "./config/env.mjs";
import { api } from "./routes/api.mjs";
import { describeError } from "./services/errors.mjs";
import { createAccessControl } from "./middleware/access.mjs";

export const app = express();
app.disable("x-powered-by");
app.use(createAccessControl());
app.get("/healthz", (_req, res) => res.json({ ok: true }));
app.use((req, res, next) => {
  if (
    req.path.startsWith(network.apiPrefix) &&
    !["GET", "HEAD"].includes(req.method) &&
    !req.is("application/json")
  )
    return res
      .status(415)
      .json({ error: "application/json 요청만 허용합니다." });
  next();
});
app.use(express.json({ limit: queryLimits.requestBody }));
app.use(network.apiPrefix, api);
app.use(network.apiPrefix, (_req, res) =>
  res.status(404).json({ error: "존재하지 않는 API입니다." }),
);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
if (fs.existsSync(path.join(root, "dist/index.html"))) {
  app.use(express.static(path.join(root, "dist")));
  app.get("/{*path}", (_req, res) =>
    res.sendFile(path.join(root, "dist/index.html")),
  );
}
app.use((error, _req, res, _next) => {
  console.error(error.message);
  const status =
    error.status ||
    (["ELOGIN", "ESOCKET", "ECONNCLOSED"].includes(error.code) ? 503 : 500);
  res.status(status).json({
    error: status === 413 ? "요청이 너무 큽니다." : describeError(error),
    code: error.code,
  });
});
const server = app.listen(config.port, config.host, () =>
  console.log(`QueryGround API → http://${config.host}:${config.port}`),
);
server.on("error", (error) => {
  console.error(
    error.code === "EADDRINUSE"
      ? `API 포트 ${config.port}가 이미 사용 중입니다. 기존 실행을 종료하거나 PORT를 변경하세요.`
      : error.message,
  );
  process.exit(1);
});
const stop = () => server.close(() => process.exit());
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
