import { test, expect } from "@playwright/test";

test.describe("Login page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("renders the login card with title", async ({ page }) => {
    await expect(
      page.getByText("問の間にログイン")
    ).toBeVisible();
  });

  test("renders description text", async ({ page }) => {
    await expect(
      page.getByText("アカウントにログイン")
    ).toBeVisible();
  });

  test("renders Google OAuth button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /Google/ })
    ).toBeVisible();
  });

  test("renders X (Twitter) OAuth button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /Twitter/ })
    ).toBeVisible();
  });

  test("renders terms and privacy links", async ({ page }) => {
    await expect(page.getByRole("link", { name: "利用規約" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "プライバシーポリシー" })
    ).toBeVisible();
  });

  test("shows error message when auth fails", async ({ page }) => {
    await page.goto("/login?error=auth_callback_failed");
    await expect(
      page.getByText("ログインに失敗しました")
    ).toBeVisible();
  });
});
