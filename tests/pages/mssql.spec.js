import { test, expect } from "@playwright/test";
import { sourceFiles } from "../../shared/workspace.mjs";

test("MSSQL-only Pages uses the real API or disables execution until it is configured", async ({
  page,
}) => {
  const workerUrls = [];
  page.on("worker", (worker) => workerUrls.push(worker.url()));
  await page.goto("./");
  await expect(page.locator(".cm-content")).toBeVisible();
  if (process.env.VITE_API_BASE_URL) {
    await expect(page.locator(".connection-badge")).toHaveText(
      "SQL Server 연결됨",
    );
    await page
      .locator(".cm-content")
      .fill(
        "SELECT CAST(SERVERPROPERTY('ProductVersion') AS VARCHAR(30)) AS SQLServerVersion, DB_NAME() AS DatabaseName;",
      );
    await page.locator(".cm-content").press("ArrowRight");
    await page.locator(".run-button").click();
    await expect(page.locator(".result-status")).toContainText("정상 실행");
    await expect(page.locator(".result-table")).toContainText(
      "SQLServerVersion",
    );
  } else {
    await expect(page.locator(".connection-badge")).toHaveText(
      "SQL Server 연결 대기",
    );
    await expect(page.locator(".mssql-connection-notice")).toBeVisible();
    await page.locator(".cm-content").fill("SELECT TOP (5) * FROM dbo.exam;");
    await expect(page.locator(".run-button")).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "DB 초기화", exact: true }),
    ).toBeDisabled();
    await expect(page.locator(".result-table")).toHaveCount(0);
  }
  await expect(page.locator("body")).not.toContainText("SQLite");
  expect(workerUrls).toEqual([]);
});

test("MSSQL learning content and PDF remain accessible before server provisioning", async ({
  page,
  request,
}) => {
  await page.goto("./");
  await page.locator(".nav-item").filter({ hasText: "학습 로드맵" }).click();
  await expect(page.locator(".lesson-card")).toHaveCount(23);
  await page.getByRole("button", { name: /확장 실습/ }).click();
  await expect(page.locator(".lesson-card")).toHaveCount(12);
  await page
    .locator(".lesson-card")
    .filter({ hasText: "저장 프로시저와 매개변수" })
    .click();
  await page.getByRole("button", { name: "정답 보기", exact: true }).click();
  await expect(page.locator(".answer-box")).toContainText(
    "CREATE OR ALTER PROCEDURE",
  );
  await expect(page.locator("body")).not.toContainText("SQL Server 실습 필요");
  expect((await request.get(`materials/${sourceFiles.pages}`)).ok()).toBe(true);
  const pdf = await request.get(`materials/${sourceFiles.pdf}`);
  expect(pdf.ok()).toBe(true);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
});

test("MSSQL Pages fits a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await expect(page.locator(".cm-content")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
