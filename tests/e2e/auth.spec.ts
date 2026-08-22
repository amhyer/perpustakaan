/**
 * E2E tests untuk authentication flow.
 */

import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("login with valid credentials", async ({ page }) => {
    await page.goto("/");

    // Should show login form
    await expect(page.getByRole("heading", { name: /masuk ke akun/i })).toBeVisible();

    // Fill credentials
    await page.getByLabel(/email/i).fill("pustakawan@jendelailmu.sch.id");
    await page.getByLabel(/password/i).fill("password123");

    // Click login
    await page.getByRole("button", { name: /^masuk$/i }).click();

    // Should redirect to dashboard
    await expect(page.getByRole("heading", { name: /dashboard pustakawan/i })).toBeVisible({
      timeout: 15_000,
    });
  });

  test("login with invalid credentials shows error", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel(/email/i).fill("wrong@email.com");
    await page.getByLabel(/password/i).fill("wrongpassword");
    await page.getByRole("button", { name: /^masuk$/i }).click();

    // Should show error toast
    await expect(page.getByText(/email atau password salah/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test("forgot password link visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /lupa password/i })).toBeVisible();
  });

  test("demo accounts are clickable", async ({ page }) => {
    await page.goto("/");
    const librarianCard = page.getByRole("button", { name: /pustakawan/i });
    await librarianCard.click();
    // Email field should be auto-filled
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toHaveValue("pustakawan@jendelailmu.sch.id");
  });
});

test.describe("Session management", () => {
  test("logout clears session", async ({ page, context }) => {
    // Login first
    await page.goto("/");
    await page.getByLabel(/email/i).fill("pustakawan@jendelailmu.sch.id");
    await page.getByLabel(/password/i).fill("password123");
    await page.getByRole("button", { name: /^masuk$/i }).click();
    await expect(page.getByRole("heading", { name: /dashboard pustakawan/i })).toBeVisible({
      timeout: 15_000,
    });

    // Logout via user menu
    await page.getByRole("button", { name: /pustakawan/i }).first().click();
    await page.getByRole("menuitem", { name: /keluar/i }).click();

    // Should show login
    await expect(page.getByRole("heading", { name: /masuk ke akun/i })).toBeVisible({
      timeout: 5000,
    });
  });
});
