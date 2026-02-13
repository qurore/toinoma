import { test, expect } from "@playwright/test";

test.describe("Explore page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/explore");
  });

  test("renders the page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "問題を探す" })
    ).toBeVisible();
  });

  test("renders the description text", async ({ page }) => {
    await expect(
      page.getByText("大学入試対策の問題セットを見つけよう")
    ).toBeVisible();
  });

  test("renders the search input", async ({ page }) => {
    await expect(
      page.getByPlaceholder("キーワードで検索...")
    ).toBeVisible();
  });

  test("renders the subject filter with all options", async ({ page }) => {
    const subjectSelect = page.locator('select[name="subject"]');
    await expect(subjectSelect).toBeVisible();

    // Default option
    await expect(subjectSelect.locator("option", { hasText: "すべての教科" })).toBeAttached();

    // All 9 subject options
    const subjects = [
      "数学",
      "英語",
      "国語",
      "物理",
      "化学",
      "生物",
      "日本史",
      "世界史",
      "地理",
    ];
    for (const subject of subjects) {
      await expect(
        subjectSelect.locator("option", { hasText: subject })
      ).toBeAttached();
    }
  });

  test("renders the difficulty filter with all options", async ({ page }) => {
    const difficultySelect = page.locator('select[name="difficulty"]');
    await expect(difficultySelect).toBeVisible();

    // Default option
    await expect(difficultySelect.locator("option", { hasText: "すべての難易度" })).toBeAttached();

    // All 3 difficulty options
    const difficulties = ["基礎", "標準", "発展"];
    for (const difficulty of difficulties) {
      await expect(
        difficultySelect.locator("option", { hasText: difficulty })
      ).toBeAttached();
    }
  });

  test("renders the search button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: "検索" })
    ).toBeVisible();
  });

  test("can select a subject from the dropdown", async ({ page }) => {
    const subjectSelect = page.locator('select[name="subject"]');
    await subjectSelect.selectOption("math");
    await expect(subjectSelect).toHaveValue("math");
  });

  test("can select a difficulty from the dropdown", async ({ page }) => {
    const difficultySelect = page.locator('select[name="difficulty"]');
    await difficultySelect.selectOption("hard");
    await expect(difficultySelect).toHaveValue("hard");
  });

  test("shows empty state when no results match", async ({ page }) => {
    // The page should show some kind of results area or empty state
    // With no published problem sets, the empty state should appear
    await expect(
      page.getByText("該当する問題セットが見つかりませんでした")
    ).toBeVisible();
  });
});
