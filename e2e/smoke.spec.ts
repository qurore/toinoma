import { test, expect } from "@playwright/test";

test("home page loads with Toinoma heading", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Toinoma" })).toBeVisible();
});
