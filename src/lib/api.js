export async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, {
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
export const api = {
  health: (database, signal) =>
    request(
      `/health${database ? `?database=${encodeURIComponent(database)}` : ""}`,
      { signal },
    ),
  databases: () => request("/databases"),
  setup: () =>
    request("/setup", {
      method: "POST",
      body: JSON.stringify({ confirm: "setup" }),
    }),
  curriculum: () => request("/curriculum"),
  schema: (id) => request(`/databases/${id}/schema`),
  query: (database, sql, signal) =>
    request("/query", {
      method: "POST",
      body: JSON.stringify({ database, sql }),
      signal,
    }),
  reset: (database) =>
    request(`/databases/${database}/reset`, {
      method: "POST",
      body: JSON.stringify({ confirm: database }),
    }),
};
