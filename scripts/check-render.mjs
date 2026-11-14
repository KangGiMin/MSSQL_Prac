import { createServer } from "vite";
import { renderToString } from "react-dom/server";
import React from "react";
import assert from "node:assert/strict";
const vite = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});
try {
  const { default: App } = await vite.ssrLoadModule("/src/app/App.jsx");
  const html = renderToString(React.createElement(App));
  for (const text of [
    "QueryGround",
    "워크벤치",
    "SQL 쿼리 편집기",
    "실행 결과",
    "정답과 예시 SQL 보기",
    "회사 · 인사",
    "온라인 스토어",
    "캠퍼스",
  ])
    assert.ok(html.includes(text), text);
  console.log(
    `React server render passed (${html.length.toLocaleString()} characters). Browser interaction and visual QA require an available browser connection.`,
  );
} finally {
  await vite.close();
}
