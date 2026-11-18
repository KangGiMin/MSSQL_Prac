import { createHash, timingSafeEqual } from "node:crypto";

const loopback = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);
const digest = (value) => createHash("sha256").update(value).digest();

export function createAccessControl(env = process.env) {
  const mode = env.DEPLOYMENT_MODE || "local";
  if (!["local", "hosted"].includes(mode))
    throw new Error("DEPLOYMENT_MODE는 local 또는 hosted여야 합니다.");
  const access = env.APP_ACCESS || "private";
  if (!["private", "public"].includes(access))
    throw new Error("APP_ACCESS는 private 또는 public이어야 합니다.");
  if (access === "public" && mode !== "hosted")
    throw new Error("공개 접속은 DEPLOYMENT_MODE=hosted에서만 허용합니다.");

  let allowedOrigin, clientOrigin, credentials;
  if (mode === "hosted") {
    const source = env.PUBLIC_ORIGIN || env.RENDER_EXTERNAL_URL;
    const url = source && URL.parse(source);
    if (
      !url ||
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    )
      throw new Error(
        "배포 주소를 PUBLIC_ORIGIN에 https://도메인 형태로 지정하세요.",
      );
    if (
      access === "private" &&
      (!env.APP_USER ||
        /[:\s]/.test(env.APP_USER) ||
        !env.APP_PASSWORD ||
        env.APP_PASSWORD.length < 16 ||
        /[\r\n]/.test(env.APP_PASSWORD))
    )
      throw new Error(
        "배포에는 APP_USER와 16자 이상의 APP_PASSWORD가 필요합니다.",
      );
    allowedOrigin = url.origin;
    if (env.PUBLIC_CLIENT_ORIGIN) {
      const client = URL.parse(env.PUBLIC_CLIENT_ORIGIN);
      if (
        !client ||
        client.protocol !== "https:" ||
        client.username ||
        client.password ||
        client.pathname !== "/" ||
        client.search ||
        client.hash
      )
        throw new Error(
          "PUBLIC_CLIENT_ORIGIN은 https://호스트 형태여야 합니다.",
        );
      clientOrigin = client.origin;
    }
    if (access === "private")
      credentials = digest(`${env.APP_USER}:${env.APP_PASSWORD}`);
  }

  return (req, res, next) => {
    if (mode === "local" && !loopback.has(req.socket.remoteAddress))
      return res
        .status(403)
        .json({ error: "이 실습 서버는 로컬에서만 사용할 수 있습니다." });

    // This contains no SQL or account information and is used by the host's probe.
    if (
      mode === "hosted" &&
      req.path === "/healthz" &&
      ["GET", "HEAD"].includes(req.method)
    )
      return next();

    const origin = req.get("origin");
    if (
      origin &&
      (mode === "hosted"
        ? ![allowedOrigin, clientOrigin].includes(origin)
        : !/^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin))
    )
      return res.status(403).json({ error: "허용되지 않은 요청 출처입니다." });

    if (mode === "hosted") {
      // The deployment exposes this process only through its managed HTTPS proxy.
      if (!req.secure && req.get("x-forwarded-proto") !== "https")
        return res.status(403).json({ error: "HTTPS 주소로 접속해 주세요." });
      if (
        origin === clientOrigin &&
        clientOrigin &&
        req.path.startsWith("/api")
      ) {
        res.set("Access-Control-Allow-Origin", clientOrigin);
        res.vary("Origin");
        if (req.method === "OPTIONS") {
          const method = req.get("access-control-request-method");
          const headers = (req.get("access-control-request-headers") || "")
            .split(",")
            .map((value) => value.trim().toLowerCase())
            .filter(Boolean);
          if (
            !["GET", "HEAD", "POST"].includes(method) ||
            headers.some((header) => header !== "content-type")
          )
            return res
              .status(403)
              .json({ error: "허용되지 않은 API 사전 요청입니다." });
          res.set("Access-Control-Allow-Methods", "GET, HEAD, POST");
          res.set("Access-Control-Allow-Headers", "Content-Type");
          res.set("Access-Control-Max-Age", "600");
          return res.status(204).end();
        }
      }
      if (access === "public") {
        if (req.path === "/api/setup")
          return res.status(403).json({
            error: "공개 사이트의 DB 준비는 서버 시작 과정에서 관리합니다.",
          });
        res.locals.publicWorkspace = true;
        if (req.path.startsWith("/api")) res.set("Cache-Control", "no-store");
        return next();
      }
      const match = /^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(
        req.get("authorization") || "",
      );
      const provided = match
        ? Buffer.from(match[1], "base64")
        : Buffer.alloc(0);
      if (!timingSafeEqual(credentials, digest(provided))) {
        res.set(
          "WWW-Authenticate",
          'Basic realm="QueryGround", charset="UTF-8"',
        );
        res.set("Cache-Control", "no-store");
        return res
          .status(401)
          .json({ error: "접속 계정으로 로그인해 주세요." });
      }
      res.set("Cache-Control", "private, no-store");
    }
    next();
  };
}
