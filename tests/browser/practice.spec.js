import { test, expect } from "@playwright/test";
import { practiceProblems } from "../../shared/practice-problems.mjs";
import fs from "node:fs/promises";

test("practice shows dataset-specific requirements and preserves SQL and each dataset's current problem", async ({
  page,
}) => {
  await page.goto("/");
  const problem = page.locator(".practice-problem");
  const editor = page.locator(".cm-content");
  await expect(problem).toHaveAttribute("data-database", "campus");
  await expect(editor).toBeVisible();
  const firstId = await problem.getAttribute("data-problem-id");
  const firstProblem = practiceProblems.find((item) => item.id === firstId);
  await expect(problem.locator("ol li")).toHaveCount(
    firstProblem.requirements.length,
  );
  await expect(problem.locator("pre")).toBeHidden();
  await editor.fill("SELECT 123 AS my_draft;");
  await problem.locator("summary").filter({ hasText: "힌트 보기" }).click();
  await expect(problem).toContainText(firstProblem.hint);
  await problem.locator("summary").filter({ hasText: "정답 보기" }).click();
  await expect(problem.locator("pre")).toHaveText(firstProblem.answer);
  await problem.getByRole("button", { name: "다른 문제" }).click();
  await expect(problem).not.toHaveAttribute("data-problem-id", firstId);
  await expect(problem.locator("pre")).toBeHidden();
  await expect(problem.locator("details[open]")).toHaveCount(0);
  await expect(editor).toHaveText("SELECT 123 AS my_draft;");
  const nextId = await problem.getAttribute("data-problem-id");
  await page.locator(".database-card").nth(0).click();
  await expect(problem).toHaveAttribute("data-database", "company");
  await expect(problem).toContainText("직원 정보");
  await page.locator(".database-card").nth(1).click();
  await expect(problem).toHaveAttribute("data-database", "store");
  await expect(problem).toContainText("주문 정보");
  await page.locator(".database-card").nth(2).click();
  await expect(problem).toHaveAttribute("data-problem-id", nextId);
  await expect(editor).toHaveText("SELECT 123 AS my_draft;");
  await page.locator(".nav-item").filter({ hasText: "학습 로드맵" }).click();
  await page.locator(".nav-item").filter({ hasText: "자유 실습" }).click();
  await expect(problem).toHaveAttribute("data-problem-id", nextId);
});

test("roadmap lessons retain their own instructions and switching to free practice restores a random problem", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator(".nav-item").filter({ hasText: "학습 로드맵" }).click();
  const title = await page.locator(".lesson-card h3").first().textContent();
  await page.locator(".lesson-card").first().click();
  await expect(page.locator(".lesson-panel h3")).toHaveText(title);
  await expect(page.locator(".practice-problem")).toHaveCount(0);
  await page.locator(".nav-item").filter({ hasText: "자유 실습" }).click();
  await expect(page.locator(".practice-problem")).toBeVisible();
});

test("practice problems and expanded answers fit a narrow mobile screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 850 });
  await page.goto("/");
  const problem = page.locator(".practice-problem");
  await expect(problem).toBeVisible();
  await problem.locator("summary").filter({ hasText: "정답 보기" }).click();
  const bounds = await problem.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("all practice example answers execute against their assigned real database", async ({
  request,
}) => {
  for (const problem of practiceProblems) {
    const response = await request.post("/api/query", {
      data: { database: problem.database, sql: problem.answer },
    });
    expect(response.status(), problem.id).toBe(200);
    const result = await response.json();
    expect(result.error, problem.id).toBeNull();
    expect(result.recordsets, problem.id).toHaveLength(1);
    expect(result.recordsets[0].columns.length, problem.id).toBeGreaterThan(0);
  }
});

test("a running query keeps its current practice problem", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".connection-badge")).toHaveText(
    "SQL Server 연결됨",
  );
  await page.locator(".cm-content").fill("SELECT 1 AS answer;");
  const problem = page.locator(".practice-problem");
  const id = await problem.getAttribute("data-problem-id");
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  await page.route("**/api/query", async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page.locator(".run-button").click();
    await expect(
      problem.getByRole("button", { name: "다른 문제" }),
    ).toBeDisabled();
    await expect(problem).toHaveAttribute("data-problem-id", id);
  } finally {
    release();
  }
  await expect(page.locator(".result-table tbody tr")).toHaveCount(1);
  await expect(
    problem.getByRole("button", { name: "다른 문제" }),
  ).toBeEnabled();
});

test("refresh draws a different problem and clears only the selected editor while keeping saved work", async ({
  page,
}) => {
  await page.goto("/");
  const editor = page.locator(".cm-content");
  const problem = page.locator(".practice-problem");
  await expect(editor).toBeVisible();
  await editor.fill("SELECT 11 AS campus_draft;");
  await page.locator(".database-card").nth(0).click();
  await expect(page.locator(".connection-badge")).toHaveText(
    "SQL Server 연결됨",
  );
  const sql = "SELECT 22 AS company_draft;";
  await editor.fill(sql);
  await page.locator(".run-button").click();
  await expect(page.locator(".result-table tbody tr")).toHaveCount(1);
  await page.locator(".editor-toolbar .text-button").first().click();
  await page.locator(".modal input").fill("새로고침 보존 확인");
  await page.locator(".modal-actions .primary-button").click();
  await expect(page.locator(".toast")).toContainText("쿼리를 저장했습니다");
  const previousId = await problem.getAttribute("data-problem-id");
  await problem.locator("summary").filter({ hasText: "정답 보기" }).click();
  await page.reload();
  await expect(problem).toHaveAttribute("data-database", "company");
  await expect(problem).not.toHaveAttribute("data-problem-id", previousId);
  await expect(editor).toHaveText("");
  await expect(page.locator(".run-button")).toBeDisabled();
  await expect(page.locator(".result-table")).toHaveCount(0);
  await expect(problem.locator("details[open]")).toHaveCount(0);
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("qg.saved")),
  );
  const history = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("qg.history")),
  );
  expect(saved[0].sql).toBe(sql);
  expect(history[0].sql).toBe(sql);
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage)
        .filter((key) => key.startsWith("qg.archive."))
        .map((key) => JSON.parse(localStorage.getItem(key)))
        .filter((item) => item.title === "새로고침 전 자동 보관"),
    ),
  ).toEqual([expect.objectContaining({ database: "company", sql })]);
  await page.locator(".database-card").nth(2).click();
  await expect(editor).toHaveText("SELECT 11 AS campus_draft;");
  await page.locator(".database-card").nth(0).click();
  await expect(editor).toHaveText("");
  const nextId = await problem.getAttribute("data-problem-id");
  await page.reload();
  await expect(problem).not.toHaveAttribute("data-problem-id", nextId);
  await expect(editor).toHaveText("");
  await editor.pressSequentially("SELECT 33 AS new_draft;");
  await expect(editor).toHaveText("SELECT 33 AS new_draft;");
  await expect(page.locator(".editor-toolbar")).toContainText("자동 저장됨");
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("qg.queries")).company,
      ),
    )
    .toBe("SELECT 33 AS new_draft;");
});

test("refreshing one tab does not clear another tab's active SQL", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.locator(".cm-content").fill("SELECT 44 AS shared_draft;");
  await expect(page.locator(".editor-toolbar")).toContainText("자동 저장됨");
  const other = await context.newPage();
  await other.goto("/");
  await expect(other.locator(".cm-content")).toHaveText(
    "SELECT 44 AS shared_draft;",
  );
  await page.reload();
  await expect(page.locator(".cm-content")).toHaveText("");
  await expect(other.locator(".cm-content")).toHaveText(
    "SELECT 44 AS shared_draft;",
  );
});

test("refreshing a different page keeps its SQL and backups reflect the cleared editor", async ({
  page,
}) => {
  await page.goto("/");
  const editor = page.locator(".cm-content");
  await editor.fill("SELECT 55 AS kept_on_history_refresh;");
  await page.locator(".nav-item").filter({ hasText: "실행 기록" }).click();
  await page.reload();
  await expect(editor).toHaveText("SELECT 55 AS kept_on_history_refresh;");
  await page.reload();
  await expect(editor).toHaveText("");
  await page.locator(".nav-item").filter({ hasText: "실행 기록" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "전체 백업", exact: true }).click();
  const backup = JSON.parse(
    await fs.readFile(await (await download).path(), "utf8"),
  );
  expect(backup.queries.campus).toBe("");
  expect(backup.archives).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ sql: "SELECT 55 AS kept_on_history_refresh;" }),
    ]),
  );
  await page.reload();
  await expect(editor).toHaveText("");
  await page.locator(".nav-item").filter({ hasText: "실행 기록" }).click();
  await page.getByRole("button", { name: /^자동 보관/ }).click();
  const archived = page
    .locator(".history-list article")
    .filter({ hasText: "새로고침 전 자동 보관" });
  await archived.getByRole("button", { name: "편집기에서 열기" }).click();
  await expect(editor).toHaveText("SELECT 55 AS kept_on_history_refresh;");
});

test("reload still clears SQL when session storage is unavailable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const get = Storage.prototype.getItem;
    const set = Storage.prototype.setItem;
    Storage.prototype.getItem = function (key) {
      if (this === sessionStorage)
        throw new DOMException("blocked", "SecurityError");
      return get.call(this, key);
    };
    Storage.prototype.setItem = function (key, value) {
      if (this === sessionStorage)
        throw new DOMException("blocked", "SecurityError");
      return set.call(this, key, value);
    };
  });
  await page.goto("/");
  await page.locator(".cm-content").fill("SELECT 66 AS clear_me;");
  await expect(page.locator(".editor-toolbar")).toContainText("자동 저장됨");
  await page.reload();
  await expect(page.locator(".cm-content")).toHaveText("");
  await expect(page.locator(".practice-problem")).toBeVisible();
});
