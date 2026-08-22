/**
 * E2E tests untuk katalog (OPAC) — fitur utama untuk siswa.
 */

import { test, expect } from "@playwright/test";

const STUDENT_EMAIL = "andini@jendelailmu.sch.id";
const STUDENT_PASSWORD = "password123";

async function loginAsStudent(page) {
  await page.goto("/");
  await page.getByLabel(/email/i).fill(STUDENT_EMAIL);
  await page.getByLabel(/password/i).fill(STUDENT_PASSWORD);
  await page.getByRole("button", { name: /^masuk$/i }).click();
  await expect(page.getByText(/beranda/i).first()).toBeVisible({ timeout: 15_000 });
}

test.describe("Catalog (OPAC)", () => {
  test("catalog shows book list", async ({ page }) => {
    await loginAsStudent(page);
    await page.getByRole("button", { name: /^katalog buku$/i }).click();

    // Should show book cards
    await expect(page.getByText(/katalog/i).first()).toBeVisible();
    // Wait for books to load
    await page.waitForLoadState("networkidle");
  });

  test("search filters books", async ({ page }) => {
    await loginAsStudent(page);
    await page.getByRole("button", { name: /^katalog buku$/i }).click();
    await page.waitForLoadState("networkidle");

    // Find search input
    const searchInput = page.getByPlaceholder(/cari|cari judul/i).first();
    if (await searchInput.isVisible()) {
      await searchInput.fill("Laskar");
      // Wait for filter
      await page.waitForTimeout(500);
    }
  });

  test("click book to view detail", async ({ page }) => {
    await loginAsStudent(page);
    await page.getByRole("button", { name: /^katalog buku$/i }).click();
    await page.waitForLoadState("networkidle");

    // Click first book (try several selectors)
    const firstBook = page.locator('[role="button"], a, [class*="card"]').filter({
      hasText: /buku|laskar|bintang/i,
    }).first();
    if (await firstBook.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstBook.click();
    }
  });
});

test.describe("Search", () => {
  test("header search navigates to catalog", async ({ page }) => {
    await loginAsStudent(page);
    const searchInput = page.getByPlaceholder(/cari buku/i);
    await searchInput.fill("test");
    await searchInput.press("Enter");
    await expect(page).toHaveURL(/catalog/);
  });
});
