import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders the navbar with logo and navigation links", async ({
    page,
  }) => {
    // Logo text in navbar
    await expect(page.locator("header").getByText("問の間")).toBeVisible();

    // Navigation links
    await expect(
      page.locator("header").getByRole("link", { name: "問題を探す" })
    ).toBeVisible();
    await expect(
      page.locator("header").getByRole("link", { name: "出題する" })
    ).toBeVisible();
  });

  test("renders the hero section with headline and CTA buttons", async ({
    page,
  }) => {
    // h1 containing 問の間
    await expect(page.locator("h1")).toContainText("問の間");
    await expect(page.locator("h1")).toContainText("Toinoma");

    // CTA buttons in hero
    const heroSection = page.locator("section").first();
    await expect(
      heroSection.getByRole("link", { name: "問題を探す" })
    ).toBeVisible();
    await expect(
      heroSection.getByRole("link", { name: "出題者になる" })
    ).toBeVisible();
  });

  test("renders the value proposition section with 4 cards", async ({
    page,
  }) => {
    await expect(page.getByText("問の間が解決すること")).toBeVisible();

    // 4 value proposition cards
    await expect(page.getByText("統一マーケットプレイス")).toBeVisible();
    await expect(page.getByText("AI自動採点")).toBeVisible();
    await expect(page.getByText("詳細フィードバック")).toBeVisible();
    await expect(page.getByText("出題者の収益化")).toBeVisible();
  });

  test("renders the how it works section with 4 steps", async ({ page }) => {
    await expect(page.getByText("4ステップで始める")).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "問題を探す" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "解答を提出" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "AI採点を受ける" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "実力を伸ばす" })
    ).toBeVisible();
  });

  test("renders the subjects section with 9 subjects", async ({ page }) => {
    await expect(page.getByText("9教科に対応")).toBeVisible();

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
      await expect(page.getByText(subject, { exact: true })).toBeVisible();
    }
  });

  test("renders the CTA section", async ({ page }) => {
    await expect(
      page.getByText("問いと答えが出会う場所")
    ).toBeVisible();
    await expect(
      page.getByText("Where questions meet answers.")
    ).toBeVisible();
  });

  test("renders the footer with links", async ({ page }) => {
    const footer = page.locator("footer");
    await expect(footer.getByText("利用規約")).toBeVisible();
    await expect(footer.getByText("プライバシー")).toBeVisible();
    await expect(footer.getByText("特定商取引法")).toBeVisible();
    await expect(footer.getByText("お問い合わせ")).toBeVisible();
  });

  test("has correct page title", async ({ page }) => {
    await expect(page).toHaveTitle(/Toinoma/);
  });
});
