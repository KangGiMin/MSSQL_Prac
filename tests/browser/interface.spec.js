import { test, expect } from "@playwright/test";

test("mobile save notifications stay fully within the screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".cm-content")).toBeVisible();
  await page.locator(".editor-toolbar .text-button").first().click();
  await page.locator(".modal input").fill("모바일 저장 확인");
  await page.locator(".modal-actions .primary-button").click();
  await expect(page.locator(".toast")).toContainText("쿼리를 저장했습니다");
  const bounds = await page.locator(".toast").boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(15);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(375);
});
