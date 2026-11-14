import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

async function open(page) {
  await page.goto("/");
  await expect(page.locator(".cm-content")).toBeVisible();
  await expect(page.locator(".connection-badge")).toHaveText(
    "SQL Server 연결됨",
  );
}
async function edit(page, sql) {
  await page.locator(".cm-content").fill(sql);
}
async function stored(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("qg.queries")));
}

test("Ctrl+Enter executes SQL without inserting a newline; F5 also executes", async ({
  page,
}) => {
  await open(page);
  const sql = "SELECT 42 AS answer;";
  await edit(page, sql);
  const request = page.waitForRequest((r) => r.url().endsWith("/api/query"));
  await page.locator(".cm-content").press("ControlOrMeta+Enter");
  expect((await request).postDataJSON().sql).toBe(sql);
  await expect(page.locator(".result-table tbody tr")).toHaveCount(1);
  await expect(page.locator(".result-table tbody td").nth(1)).toHaveText("42");
  expect((await stored(page)).campus).toBe(sql);
  await edit(page, "SELECT 43 AS answer;");
  await page.locator(".cm-content").press("F5");
  await expect(page.locator(".result-table tbody td").nth(1)).toHaveText("43");
});
test("selection execution sends only the selected statement", async ({
  page,
}) => {
  await open(page);
  await edit(page, "SELECT 1;\nSELECT 2;");
  await page.locator(".cm-content").press("ControlOrMeta+Home");
  await page.locator(".cm-content").press("Shift+End");
  const request = page.waitForRequest((r) => r.url().endsWith("/api/query"));
  await page.locator(".cm-content").press("ControlOrMeta+Enter");
  expect((await request).postDataJSON().sql).toBe("SELECT 1;");
  await expect(page.locator(".result-table tbody td").nth(1)).toHaveText("1");
});
test("disconnected shortcuts are blocked and reconnect reloads schema", async ({
  page,
}) => {
  await page.route("**/api/health?database=*", (route) =>
    route.fulfill({
      status: 503,
      json: { ok: false, error: "test disconnected" },
    }),
  );
  await page.goto("/");
  await expect(page.locator(".run-button")).toBeDisabled();
  let requests = 0;
  page.on("request", (r) => {
    if (r.url().endsWith("/api/query")) requests++;
  });
  await page.locator(".cm-content").press("F5");
  await page.locator(".cm-content").press("ControlOrMeta+Enter");
  await page.waitForTimeout(150);
  expect(requests).toBe(0);
  await page.unroute("**/api/health?database=*");
  await page.getByRole("button", { name: "다시 연결", exact: true }).click();
  await expect(page.locator(".connection-badge")).toHaveText(
    "SQL Server 연결됨",
  );
  await expect(page.locator(".schema-table")).toHaveCount(5);
});
test("damaged local state recovers without crashing or losing valid saved SQL", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("qg.completed", "{}");
    localStorage.setItem(
      "qg.saved",
      JSON.stringify([
        null,
        {
          id: "valid",
          database: "campus",
          sql: "SELECT 7;",
          time: "2026-01-01T00:00:00Z",
          title: { bad: true },
        },
      ]),
    );
  });
  await open(page);
  await expect(page.getByRole("alert")).toContainText("복구");
  await page.locator(".nav-item").filter({ hasText: "실행 기록" }).click();
  await page
    .getByRole("button", { name: "저장한 쿼리 1", exact: true })
    .click();
  await expect(page.locator(".history-list pre")).toHaveText("SELECT 7;");
});
test("quota failures show unsaved status and backup contains the in-memory draft", async ({
  page,
}) => {
  await open(page);
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("quota", "QuotaExceededError");
    };
  });
  await edit(page, "SELECT 99 AS unsaved;");
  await expect(page.locator(".editor-toolbar")).toContainText("저장 실패");
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "지금 백업", exact: true }).click();
  const data = JSON.parse(
    await fs.readFile(await (await event).path(), "utf8"),
  );
  expect(data.queries.campus).toBe("SELECT 99 AS unsaved;");
});
test("two tabs retain independent DB drafts and preserve conflicting drafts", async ({
  page,
  context,
}) => {
  await open(page);
  const other = await context.newPage();
  await open(other);
  await edit(page, "SELECT 111 AS first_tab;");
  await other.locator(".database-card").nth(0).click();
  await expect(other.locator(".connection-badge")).toHaveText(
    "SQL Server 연결됨",
  );
  await edit(other, "SELECT 222 AS second_tab;");
  await expect
    .poll(async () => stored(page))
    .toMatchObject({
      campus: "SELECT 111 AS first_tab;",
      company: "SELECT 222 AS second_tab;",
    });
  await expect(page.locator(".database-card.selected")).toContainText("캠퍼스");
  await other.locator(".database-card").nth(2).click();
  await Promise.all([
    edit(page, "SELECT 333 AS conflict_a;"),
    edit(other, "SELECT 444 AS conflict_b;"),
  ]);
  await expect
    .poll(() =>
      page.evaluate(() =>
        Object.keys(localStorage)
          .filter((k) => k.startsWith("qg.archive."))
          .map((k) => JSON.parse(localStorage.getItem(k)).sql),
      ),
    )
    .toEqual(
      expect.arrayContaining([
        "SELECT 333 AS conflict_a;",
        "SELECT 444 AS conflict_b;",
      ]),
    );
});
test("replacing SQL archives the draft and restoring it works", async ({
  page,
}) => {
  await open(page);
  await edit(page, "SELECT 55 AS keep_me;");
  await page.locator(".nav-item").filter({ hasText: "학습 로드맵" }).click();
  await page.locator(".lesson-card").first().click();
  await page.locator(".nav-item").filter({ hasText: "실행 기록" }).click();
  await page.getByRole("button", { name: /^자동 보관/ }).click();
  const item = page
    .locator(".history-list article")
    .filter({ hasText: "교체 전 자동 보관" })
    .filter({ hasText: "SELECT 55 AS keep_me;" });
  await item.getByRole("button", { name: "편집기에서 열기" }).click();
  await expect(page.locator(".cm-content")).toContainText(
    "SELECT 55 AS keep_me;",
  );
});
test("selected database and lesson stay synchronized", async ({ page }) => {
  await open(page);
  await page.locator(".database-card").nth(0).click();
  await expect(page.locator(".lesson-database")).toContainText("회사 · 인사");
  await page.reload();
  await expect(page.locator(".lesson-database")).toContainText("회사 · 인사");
});
test("prepared exercises include setup without revealing the answer", async ({
  page,
}) => {
  await open(page);
  await page.locator(".nav-item").filter({ hasText: "학습 로드맵" }).click();
  await page.locator(".segmented button").filter({ hasText: /기출/ }).click();
  await page
    .locator(".lesson-card")
    .filter({ hasText: "외래 키와 CASCADE 설정" })
    .click();
  await expect(page.locator(".cm-content")).toContainText("선행 실습 준비");
  await expect(page.locator(".cm-content")).toContainText("PRIMARY KEY");
  await expect(page.locator(".cm-content")).not.toContainText("FOREIGN KEY");
});
test("CSV and JSON downloads preserve NULL and protect CSV headers", async ({
  page,
}) => {
  await open(page);
  await edit(
    page,
    "SELECT CAST(NULL AS NVARCHAR(10)) AS [=1+1], N'' AS [empty];",
  );
  await page.locator(".run-button").click();
  await expect(page.locator(".result-table tbody tr")).toHaveCount(1);
  let event = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV", exact: true }).click();
  const csv = await fs.readFile(await (await event).path(), "utf8");
  expect(csv).toContain('"\'=1+1"');
  expect(csv).toContain('\\N,""');
  event = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  const json = JSON.parse(
    await fs.readFile(await (await event).path(), "utf8"),
  );
  expect(json.rows[0]).toEqual([null, ""]);
});
test("desktop controls stay hidden; mobile menu supports Escape and has no overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await open(page);
  await expect(page.getByRole("button", { name: "메뉴 열기" })).toBeHidden();
  await expect(page.getByRole("button", { name: "메뉴 닫기" })).toBeHidden();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "메뉴 열기" }).click();
  await expect(page.locator(".sidebar")).toHaveClass(/open/);
  await page.keyboard.press("Escape");
  await expect(page.locator(".sidebar")).not.toHaveClass(/open/);
  await expect(page.getByRole("button", { name: "메뉴 열기" })).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("PDF page controls follow the actual page list", async ({ page }) => {
  await page.route("**/materials/pages.json", (route) =>
    route.fulfill({
      json: [
        { page: 1, text: "one" },
        { page: 2, text: "two" },
        { page: 3, text: "three" },
      ],
    }),
  );
  await open(page);
  await page.locator(".nav-item").filter({ hasText: "PDF 문제집" }).click();
  await page.getByRole("button", { name: /원본 전체 보기/ }).click();
  const input = page.getByRole("spinbutton", { name: "PDF 페이지" });
  await expect(input).toHaveAttribute("max", "3");
  await input.fill("3");
  await expect(
    page.getByRole("button", { name: "다음 페이지" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "추출 텍스트로 보기" }).click();
  await expect(page.locator(".source-text pre")).toHaveText("three");
});
test("opening HTML directly shows actionable startup guidance", async ({
  page,
}) => {
  await page.goto(pathToFileURL(path.resolve("index.html")).href);
  await expect(page.locator("body")).toContainText("npm.cmd run dev");
  await expect(page.locator("body")).toContainText("5500");
});
test("backup export and restore survive a fresh browser context", async ({
  page,
  browser,
}) => {
  await open(page);
  await edit(page, "SELECT 707 AS backup_sample;");
  await page.locator(".nav-item").filter({ hasText: "실행 기록" }).click();
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "전체 백업", exact: true }).click();
  const file = await (await event).path();
  const fresh = await browser.newContext(),
    second = await fresh.newPage();
  await open(second);
  await second.locator(".nav-item").filter({ hasText: "실행 기록" }).click();
  await second.getByLabel("백업 파일 선택").setInputFiles(file);
  await expect(second.locator(".toast")).toContainText("백업을 복원했습니다");
  await second.locator(".nav-item").filter({ hasText: "자유 실습" }).click();
  await expect(second.locator(".cm-content")).toContainText("backup_sample");
  await fresh.close();
});
test("safe cross-tab storage also works without Web Locks", async ({
  page,
  context,
}) => {
  await context.addInitScript(() =>
    Object.defineProperty(navigator, "locks", { get: () => undefined }),
  );
  await open(page);
  const second = await context.newPage();
  await open(second);
  await edit(page, "SELECT 801 AS fallback_one;");
  await second.locator(".database-card").nth(0).click();
  await edit(second, "SELECT 802 AS fallback_two;");
  await expect
    .poll(() => stored(page))
    .toMatchObject({
      campus: "SELECT 801 AS fallback_one;",
      company: "SELECT 802 AS fallback_two;",
    });
});
test("a replacement is blocked when preserving the current SQL fails", async ({
  page,
}) => {
  await open(page);
  await edit(page, "SELECT 909 AS preserve_on_failure;");
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("quota", "QuotaExceededError");
    };
  });
  await page.locator(".nav-item").filter({ hasText: "학습 로드맵" }).click();
  await page.locator(".lesson-card").first().click();
  await expect(page.locator(".toast")).toContainText("교체하지 않았습니다");
  await page.locator(".nav-item").filter({ hasText: "자유 실습" }).click();
  await expect(page.locator(".cm-content")).toContainText(
    "preserve_on_failure",
  );
});
test("invalid backup files never replace the current workspace", async ({
  page,
}) => {
  await open(page);
  await edit(page, "SELECT 606 AS preserve_backup;");
  await page.locator(".nav-item").filter({ hasText: "실행 기록" }).click();
  await page.getByLabel("백업 파일 선택").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":1,"queries":{}}'),
  });
  await expect(page.locator(".toast")).toContainText("올바른 QueryGround 백업");
  expect((await stored(page)).campus).toBe("SELECT 606 AS preserve_backup;");
});
test("query API classifies bad input and reports real DB schema", async ({
  request,
}) => {
  for (const sql of [
    "GO",
    "SELECT 1;\nGO 2",
    Array(31).fill("SELECT 1;").join("\nGO\n"),
  ]) {
    const response = await request.post("/api/query", {
      data: { database: "campus", sql },
    });
    expect(response.status()).toBe(400);
  }
  const health = await request.get("/api/health?database=store");
  expect(health.ok()).toBe(true);
  expect((await health.json()).id).toBe("store");
  const schema = await (
    await request.get("/api/databases/store/schema")
  ).json();
  expect(
    schema
      .find((table) => table.name === "Products")
      .columns.find((column) => column.name === "Price").type,
  ).toBe("decimal(12,2)");
  const invalid = await request.post("/api/query", {
    data: { database: "unknown", sql: "SELECT 1;" },
  });
  expect(invalid.status()).toBe(400);
});
test("a failed Company health probe does not block a healthy Campus", async ({
  page,
}) => {
  await page.route("**/api/health?database=company", (route) =>
    route.fulfill({
      status: 503,
      json: { ok: false, error: "Company unavailable" },
    }),
  );
  await open(page);
  await page.locator(".database-card").nth(0).click();
  await expect(page.locator(".run-button")).toBeDisabled();
  await page.locator(".database-card").nth(2).click();
  await expect(page.locator(".connection-badge")).toHaveText(
    "SQL Server 연결됨",
  );
  await edit(page, "SELECT 818 AS healthy_database;");
  await page.locator(".run-button").click();
  await expect(page.locator(".result-table tbody td").nth(1)).toHaveText("818");
});
test("render failures show a recovery screen with a restorable backup", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "qg.queries",
      JSON.stringify({
        campus: "SELECT 919 AS recovery;",
        company: "SELECT 1;",
        store: "SELECT 2;",
      }),
    ),
  );
  await page.route("**/src/components/editor/QueryEditor.jsx*", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: "export default function Editor(){throw new Error('test editor failure')}",
    }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "실습실 화면을 불러오지 못했습니다." }),
  ).toBeVisible();
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "저장 내용 복구 파일" }).click();
  const backup = JSON.parse(
    await fs.readFile(await (await event).path(), "utf8"),
  );
  expect(backup.version).toBe(1);
  expect(backup.queries.campus).toBe("SELECT 919 AS recovery;");
});
test("retrying a failed save preserves changes made by another tab", async ({
  page,
  context,
}) => {
  await open(page);
  const second = await context.newPage();
  await open(second);
  await page.evaluate(() => {
    window.originalStorageWrite = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException("quota", "QuotaExceededError");
    };
  });
  await edit(page, "SELECT 505 AS retry_draft;");
  await expect(page.locator(".editor-toolbar")).toContainText("저장 실패");
  await second.locator(".database-card").nth(0).click();
  await edit(second, "SELECT 506 AS other_tab_draft;");
  await expect
    .poll(async () => (await stored(second)).company)
    .toBe("SELECT 506 AS other_tab_draft;");
  await page.evaluate(() => {
    Storage.prototype.setItem = window.originalStorageWrite;
  });
  await page.getByRole("button", { name: "다시 저장", exact: true }).click();
  await expect(page.locator(".editor-toolbar")).toContainText("자동 저장됨");
  expect(await stored(page)).toMatchObject({
    campus: "SELECT 505 AS retry_draft;",
    company: "SELECT 506 AS other_tab_draft;",
  });
});
test("archives can be cleared after confirmation without deleting the active SQL", async ({
  page,
}) => {
  await open(page);
  await edit(page, "SELECT 515 AS keep_current;");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          Object.keys(localStorage).filter((key) =>
            key.startsWith("qg.archive."),
          ).length,
      ),
    )
    .toBeGreaterThan(0);
  await page.locator(".nav-item").filter({ hasText: "실행 기록" }).click();
  await page.getByRole("button", { name: /^자동 보관/ }).click();
  await page.getByRole("button", { name: "목록 비우기", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "목록 비우기", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "자동 보관 0", exact: true }),
  ).toBeVisible();
  expect((await stored(page)).campus).toBe("SELECT 515 AS keep_current;");
});
test("cancel waits for server cleanup and the next query succeeds", async ({
  page,
}) => {
  await open(page);
  await edit(page, "BEGIN TRAN; WAITFOR DELAY '00:00:08'; SELECT 1;");
  await page.locator(".run-button").click();
  await expect(page.locator(".run-button")).toContainText("중지");
  await page.waitForTimeout(150);
  await page.locator(".run-button").click();
  await expect(page.locator(".run-button")).toContainText("실행");
  await expect(page.locator(".query-error")).toContainText("취소");
  await edit(page, "SELECT 616 AS after_cancel;");
  await page.locator(".run-button").click();
  await expect(page.locator(".result-table tbody td").nth(1)).toHaveText("616");
});
