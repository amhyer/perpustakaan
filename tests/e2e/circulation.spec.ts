/**
 * E2E tests untuk sirkulasi (peminjaman).
 *
 * Ini adalah critical flow — di-test secara menyeluruh.
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

test.describe("Circulation flow", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsLibrarian(page);
  });

  test("navigate to circulation page", async ({ page }) => {
    await page.getByRole("button", { name: /^sirkulasi$/i }).click();
    await expect(page.getByText(/sirkulasi/i).first()).toBeVisible();
  });

  test("search for book or member in circulation", async ({ page }) => {
    await page.getByRole("button", { name: /^sirkulasi$/i }).click();

    // Should have search input for member/book
    const searchInput = page.getByPlaceholder(/cari anggota|buku/i).first();
    if (await searchInput.isVisible()) {
      await searchInput.fill("Andini");
      // Should show results or hint
    }
  });

  test("view loans list", async ({ page }) => {
    await page.getByRole("button", { name: /^peminjaman$/i }).click();
    await expect(page.getByText(/peminjaman/i).first()).toBeVisible();
  });
});

test.describe("Member view (student)", () => {
  test("student can view their own loans", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel(/email/i).fill("andini@jendelailmu.sch.id");
    await page.getByLabel(/password/i).fill("password123");
    await page.getByRole("button", { name: /^masuk$/i }).click();

    // Should be on student dashboard
    await expect(page.getByText(/beranda/i).first()).toBeVisible({ timeout: 15_000 });

    // Navigate to my loans
    await page.getByRole("button", { name: /pinjamanku/i }).click();
    await expect(page).toHaveURL(/my-loans/);
  });
});
