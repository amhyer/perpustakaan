/**
 * E2E tests untuk navigation & layout.
 */

import { test, expect } from "@playwright/test";

const LIBRARIAN_EMAIL = "pustakawan@jendelailmu.sch.id";
const LIBRARIAN_PASSWORD = "password123";

async function loginAsLibrarian(page) {
  await page.goto("/");
  await page.getByLabel(/email/i).fill(LIBRARIAN_EMAIL);
  await page.getByLabel(/password/i).fill(LIBRARIAN_PASSWORD);
  await page.getByRole("button", { name: /^masuk$/i }).click();
  await expect(page.getByRole("heading", { name: /dashboard pustakawan/i })).toBeVisible({
    timeout: 15_000,
  });
}

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsLibrarian(page);
  });

  test("sidebar shows main menu items", async ({ page }) => {
    const sidebar = page.locator("aside");
    await expect(sidebar.getByRole("button", { name: /dashboard/i })).toBeVisible();
    await expect(sidebar.getByRole("button", { name: /katalog/i })).toBeVisible();
    await expect(sidebar.getByRole("button", { name: /anggota/i })).toBeVisible();
    await expect(sidebar.getByRole("button", { name: /sirkulasi/i })).toBeVisible();
    await expect(sidebar.getByRole("button", { name: /laporan/i })).toBeVisible();
    await expect(sidebar.getByRole("button", { name: /pengaturan/i })).toBeVisible();
  });

  test("navigate to catalog", async ({ page }) => {
    await page.getByRole("button", { name: /^katalog buku$/i }).click();
    await expect(page.getByRole("heading", { name: /katalog/i })).toBeVisible();
  });

  test("navigate to members", async ({ page }) => {
    await page.getByRole("button", { name: /^anggota$/i }).click();
    await expect(page.getByRole("heading", { name: /manajemen anggota/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("header search", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/cari buku/i);
    await searchInput.fill("Laskar");
    await searchInput.press("Enter");
    // Should navigate to catalog with search results
    await expect(page).toHaveURL(/catalog/);
  });
});

test.describe("Responsive design", () => {
  test("mobile view shows hamburger menu", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto("/");
    // Hamburger button should be visible
    await expect(page.getByRole("button", { name: /buka menu/i })).toBeVisible();
  });

  test("desktop view hides hamburger menu", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    await expect(page.getByRole("button", { name: /buka menu/i })).not.toBeVisible();
  });
});
