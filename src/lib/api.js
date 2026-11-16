import { network } from "../../shared/runtime.mjs";
export async function request(path, options = {}) {
  const response = await fetch(`${network.apiPrefix}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  let body;
  try {
    body = await response.json();
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error(
      "서버 응답을 읽을 수 없습니다. npm run dev로 프런트와 서버를 함께 시작하세요.",
    );
  }
  if (!response.ok)
    throw Object.assign(
      new Error(body.error || body.detail || "요청을 처리하지 못했습니다."),
      { status: response.status, body },
    );
  return body;
}
const post = (path, body, options = {}) =>
  request(path, { method: "POST", body: JSON.stringify(body), ...options });

export const api = {
  health: (database, signal) =>
    request(
      `/health${database ? `?database=${encodeURIComponent(database)}` : ""}`,
      { signal },
    ),
  databases: () => request("/databases"),
  setup: () => post("/setup", { confirm: "setup" }),
  curriculum: () => request("/curriculum"),
  schema: (id) => request(`/databases/${id}/schema`),
  query: (database, sql, signal) =>
    post("/query", { database, sql }, { signal }),
  reset: (database) =>
    post(`/databases/${database}/reset`, { confirm: database }),
};
