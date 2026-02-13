import { test, expect } from "@playwright/test";

test.describe("Seller pages (unauthenticated)", () => {
  test("redirects /sell to /login when not authenticated", async ({
    page,
  }) => {
    await page.goto("/sell");
    await page.waitForURL("**/login");
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirects /sell/new to /login when not authenticated", async ({
    page,
  }) => {
    await page.goto("/sell/new");
    await page.waitForURL("**/login");
    await expect(page).toHaveURL(/\/login/);
  });

  test("shows login page content after redirect from /sell", async ({
    page,
  }) => {
    await page.goto("/sell");
    await page.waitForURL("**/login");
    await expect(
      page.getByText("問の間にログイン")
    ).toBeVisible();
  });

  test("shows login page content after redirect from /sell/new", async ({
    page,
  }) => {
    await page.goto("/sell/new");
    await page.waitForURL("**/login");
    await expect(
      page.getByText("問の間にログイン")
    ).toBeVisible();
  });
});
