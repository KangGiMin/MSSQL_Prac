import { test, expect } from "@playwright/test";
import { sourceFiles } from "../../shared/workspace.mjs";

async function ready(page) {
  await page.goto("./");
  await expect(page.locator(".connection-badge")).toHaveText(
    "브라우저 SQL 준비됨",
  );
  await expect(page.locator(".cm-content")).toBeVisible();
}
async function run(page, sql) {
  await page.locator(".cm-content").fill(sql);
  await page.locator(".cm-content").press("ArrowRight");
  await page.locator(".run-button").click();
  await expect(page.locator(".result-status")).toContainText("정상 실행");
}

test("published build loads WASM, executes all three datasets and preserves mutations on reload", async ({
  page,
}) => {
  const failures = [];
  page.on("pageerror", (error) => failures.push(error.message));
  await ready(page);
  for (const [index, table, count] of [
    [0, "EMP", 14],
    [1, "Products", 8],
    [2, "exam_emp", 140],
  ]) {
    await page.locator(".database-card").nth(index).click();
    await expect(page.locator(".connection-badge")).toHaveText(
      "브라우저 SQL 준비됨",
    );
    await run(page, `SELECT COUNT(*) AS count FROM dbo.${table};`);
    await expect(page.locator(".result-table tbody td").nth(1)).toHaveText(
      String(count),
    );
  }
  await run(
    page,
    "INSERT dbo.exam_emp(성명) VALUES(N'웹저장검증'); UPDATE dbo.exam_emp SET 부서=N'검증부서' WHERE 성명=N'웹저장검증'; SELECT 부서 FROM dbo.exam_emp WHERE 성명=N'웹저장검증';",
  );
  await expect(page.locator(".result-table")).toContainText("검증부서");
  await page.reload();
  await expect(page.locator(".connection-badge")).toHaveText(
    "브라우저 SQL 준비됨",
  );
  await run(page, "SELECT 부서 FROM dbo.exam_emp WHERE 성명=N'웹저장검증';");
  await expect(page.locator(".result-table")).toContainText("검증부서");
  await run(
    page,
    "DELETE dbo.exam_emp WHERE 성명=N'웹저장검증'; SELECT COUNT(*) AS count FROM dbo.exam_emp;",
  );
  await expect(page.locator(".result-table tbody td").nth(1)).toHaveText("140");
  await page.screenshot({ path: "tmp/pages-desktop.png", fullPage: true });
  expect(failures).toEqual([]);
});

test("browser reset, unsupported features, visitor isolation and PDF assets work", async ({
  page,
  browser,
  request,
  baseURL,
}) => {
  await ready(page);
  await run(
    page,
    "DELETE FROM dbo.exam_emp; SELECT COUNT(*) AS count FROM dbo.exam_emp;",
  );
  await expect(page.locator(".result-table tbody td").nth(1)).toHaveText("0");
  const other = await browser.newContext({ baseURL });
  try {
    const visitor = await other.newPage();
    await ready(visitor);
    await run(visitor, "SELECT COUNT(*) AS count FROM dbo.exam_emp;");
    await expect(visitor.locator(".result-table tbody td").nth(1)).toHaveText(
      "140",
    );
  } finally {
    await other.close();
  }
  await page.getByRole("button", { name: "DB 초기화", exact: true }).click();
  await page.getByRole("button", { name: "이 DB 초기화", exact: true }).click();
  await expect(page.locator(".modal")).toHaveCount(0);
  await run(page, "SELECT COUNT(*) AS count FROM dbo.exam_emp;");
  await expect(page.locator(".result-table tbody td").nth(1)).toHaveText("140");
  await page
    .locator(".cm-content")
    .fill("CREATE OR ALTER PROCEDURE p AS SELECT 1;");
  await page.locator(".run-button").click();
  await expect(page.locator(".query-error")).toContainText(
    "SQL Server 전용 기능",
  );
  const pages = await request.get(`materials/${sourceFiles.pages}`);
  expect(pages.ok()).toBe(true);
  const pdf = await request.get(`materials/${sourceFiles.pdf}`);
  expect(pdf.ok()).toBe(true);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
});

test("browser mode fits a narrow mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await run(page, "SELECT TOP (3) 성명,영어 FROM dbo.exam ORDER BY 영어 DESC;");
  await expect(page.locator(".result-table tbody tr")).toHaveCount(3);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "tmp/pages-mobile.png", fullPage: true });
});
