import { test, expect } from "@playwright/test";

test("home page loads with Toinoma title", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Toinoma/);
});
