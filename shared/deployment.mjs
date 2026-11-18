export function resolveApiConfig({ staticSite = false, apiBaseUrl = "" } = {}) {
  const input = apiBaseUrl.trim();
  if (!input) return { origin: "", configured: !staticSite };
  const url = URL.parse(input);
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
      "VITE_API_BASE_URL은 https://호스트 형태의 외부 MSSQL API 주소여야 합니다.",
    );
  return { origin: url.origin, configured: true };
}
export const missingMssqlMessage =
  "MSSQL 실습 서버를 연결하는 중입니다. 교재와 문제 학습은 사용할 수 있으며, SQL 실행은 서버 연결 후 제공됩니다.";
