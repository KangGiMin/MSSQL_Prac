import { createHash, timingSafeEqual } from "node:crypto";

const loopback = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);
const digest = (value) => createHash("sha256").update(value).digest();

export function createAccessControl(env = process.env) {
  const mode = env.DEPLOYMENT_MODE || "local";
  if (!["local", "hosted"].includes(mode))
    throw new Error("DEPLOYMENT_MODE는 local 또는 hosted여야 합니다.");

  let allowedOrigin, credentials;
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
      !env.APP_USER ||
      /[:\s]/.test(env.APP_USER) ||
      !env.APP_PASSWORD ||
      env.APP_PASSWORD.length < 16 ||
      /[\r\n]/.test(env.APP_PASSWORD)
    )
      throw new Error(
        "배포에는 APP_USER와 16자 이상의 APP_PASSWORD가 필요합니다.",
      );
    allowedOrigin = url.origin;
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
        ? origin !== allowedOrigin
        : !/^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin))
    )
      return res.status(403).json({ error: "허용되지 않은 요청 출처입니다." });

    if (mode === "hosted") {
      // The deployment exposes this process only through its managed HTTPS proxy.
      if (!req.secure && req.get("x-forwarded-proto") !== "https")
        return res.status(403).json({ error: "HTTPS 주소로 접속해 주세요." });
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
