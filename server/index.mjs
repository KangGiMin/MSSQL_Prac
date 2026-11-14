import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { config } from "./config/env.mjs";
import { api } from "./routes/api.mjs";
import { describeError } from "./services/errors.mjs";

export const app = express();
app.disable("x-powered-by");
// Local personal SQL console. Do not expose a privileged SQL execution API publicly.
app.use((req, res, next) => {
  const remote = req.socket.remoteAddress;
  if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(remote))
    return res
      .status(403)
      .json({ error: "이 실습 서버는 로컬에서만 사용할 수 있습니다." });
  const origin = req.get("origin");
  if (origin && !/^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin))
    return res.status(403).json({ error: "허용되지 않은 요청 출처입니다." });
  if (
    req.path.startsWith("/api") &&
    !["GET", "HEAD"].includes(req.method) &&
    !req.is("application/json")
  )
    return res
      .status(415)
      .json({ error: "application/json 요청만 허용합니다." });
  next();
});
app.use(express.json({ limit: "256kb" }));
app.use("/api", api);
app.use("/api", (_req, res) =>
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
