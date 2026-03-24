import { test, expect } from "@playwright/test";

test.describe("Seller pages (unauthenticated)", () => {
  test("redirects /seller to /login when not authenticated", async ({
    page,
  }) => {
    await page.goto("/seller");
    await page.waitForURL("**/login");
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirects /seller/new to /login when not authenticated", async ({
    page,
  }) => {
    await page.goto("/seller/new");
    await page.waitForURL("**/login");
    await expect(page).toHaveURL(/\/login/);
  });

  test("shows login page content after redirect from /seller", async ({
    page,
  }) => {
    await page.goto("/seller");
    await page.waitForURL("**/login");
    await expect(
      page.getByText("問の間にログイン")
    ).toBeVisible();
  });

  test("shows login page content after redirect from /seller/new", async ({
    page,
  }) => {
    await page.goto("/seller/new");
    await page.waitForURL("**/login");
    await expect(
      page.getByText("問の間にログイン")
    ).toBeVisible();
  });
});
