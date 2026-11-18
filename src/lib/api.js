import { network } from "../../shared/runtime.mjs";
import { missingMssqlMessage } from "../../shared/deployment.mjs";
import { apiOrigin, apiConfigured } from "../config/runtime";

export async function request(path, options = {}) {
  if (!apiConfigured)
    throw Object.assign(new Error(missingMssqlMessage), {
      status: 503,
      body: { unconfigured: true },
      code: "EMSSQL_UNCONFIGURED",
    });
  const response = await fetch(`${apiOrigin}${network.apiPrefix}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  let body;
  try {
    body = await response.json();
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error(
      "MSSQL 실습 서버의 응답을 읽을 수 없습니다. 서버 연결 상태를 확인해 주세요.",
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
  health: async (database, signal) => {
    const result = await request(
      `/health${database ? `?database=${encodeURIComponent(database)}` : ""}`,
      { signal },
    );
    if (result.ok && result.engine !== "Microsoft SQL Server")
      throw new Error("실제 Microsoft SQL Server에 연결된 API가 필요합니다.");
    return result;
  },
  databases: () => request("/databases"),
  setup: () => post("/setup", { confirm: "setup" }),
  curriculum: () => request("/curriculum"),
  schema: (id) => request(`/databases/${id}/schema`),
  query: (database, sql, signal) =>
    post("/query", { database, sql }, { signal }),
  reset: (database) =>
    post(`/databases/${database}/reset`, { confirm: database }),
};
