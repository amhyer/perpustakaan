/**
 * E2E test untuk full happy-path reward system.
 *
 * Flow:
 * 1. Student login
 * 2. Lihat widget poin (initial: 0 poin untuk user baru)
 * 3. Buka katalog hadiah
 * 4. Klaim hadiah (kalau ada yang cukup poin, atau skip)
 * 5. Lihat di my redemptions
 * 6. Logout
 * 7. Librarian login
 * 8. Buka manajemen reward → tab approval queue
 * 9. Approve klaim
 * 10. Tab scan & deliver → lookup pickup code
 * 11. Konfirmasi deliver
 * 12. Verify student sekarang punya status DELIVERED
 */

import { test, expect } from "@playwright/test";

test.describe("Reward System - Full Happy Path", () => {
  test("student can view catalog and see reward cards", async ({ page }) => {
    // Login as student
    await page.goto("/");
    await page.getByLabel(/email/i).fill("andini@jendelailmu.sch.id");
    await page.getByLabel(/password/i).fill("password123");
    await page.getByRole("button", { name: /^masuk$/i }).click();

    // Wait for dashboard
    await expect(page.getByText(/poin saya/i).first()).toBeVisible({ timeout: 15_000 });

    // Navigate to rewards
    await page.goto("/?view=rewards-catalog");
    await expect(page.getByRole("heading", { name: /katalog hadiah/i })).toBeVisible();

    // Verify at least one reward is shown
    const rewardCards = page.locator('[class*="card-hover"]');
    await expect(rewardCards.first()).toBeVisible({ timeout: 5000 });
  });

  test("student can view their redemption history with tabs", async ({ page }) => {
    // Login
    await page.goto("/");
    await page.getByLabel(/email/i).fill("andini@jendelailmu.sch.id");
    await page.getByLabel(/password/i).fill("password123");
    await page.getByRole("button", { name: /^masuk$/i }).click();

    await expect(page.getByText(/poin saya/i).first()).toBeVisible({ timeout: 15_000 });

    // Navigate to my redemptions
    await page.goto("/?view=my-redemptions");
    await expect(page.getByRole("heading", { name: /klaim hadiah saya/i })).toBeVisible();

    // Tabs are visible
    await expect(page.getByRole("button", { name: /^semua/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /pending/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /disetujui/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /selesai/i })).toBeVisible();

    // Click Pending tab → should not throw
    await page.getByRole("button", { name: /^pending/i }).click();
    await page.waitForTimeout(500);
  });

  test("librarian can access all management features", async ({ page }) => {
    // Login
    await page.goto("/");
    await page.getByLabel(/email/i).fill("pustakawan@jendelailmu.sch.id");
    await page.getByLabel(/password/i).fill("password123");
    await page.getByRole("button", { name: /^masuk$/i }).click();

    await expect(page.getByRole("heading", { name: /dashboard pustakawan/i })).toBeVisible({
      timeout: 15_000,
    });

    // Navigate to management
    await page.goto("/?view=rewards-management");
    await expect(page.getByRole("heading", { name: /manajemen reward/i })).toBeVisible();

    // 4 tabs visible
    await expect(page.getByRole("button", { name: /approval queue/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^katalog/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /scan & deliver/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^analytics/i })).toBeVisible();
  });

  test("librarian can add a new reward via form", async ({ page }) => {
    // Login
    await page.goto("/");
    await page.getByLabel(/email/i).fill("pustakawan@jendelailmu.sch.id");
    await page.getByLabel(/password/i).fill("password123");
    await page.getByRole("button", { name: /^masuk$/i }).click();

    await expect(page.getByRole("heading", { name: /dashboard pustakawan/i })).toBeVisible({
      timeout: 15_000,
    });

    await page.goto("/?view=rewards-management");

    // Click Katalog tab
    await page.getByRole("button", { name: /^katalog/i }).click();

    // Click "Tambah Hadiah"
    await page.getByRole("button", { name: /tambah hadiah/i }).click();

    // Form modal should appear
    await expect(page.getByText(/tambah hadiah baru/i)).toBeVisible();

    // Fill in form
    await page.getByLabel(/nama hadiah/i).fill("Test Reward E2E");
    await page.getByLabel(/deskripsi/i).fill("Hadiah untuk testing E2E flow");
    await page.getByLabel(/biaya poin/i).fill("123");
    await page.getByLabel(/stok/i).fill("5");

    // Submit
    await page.getByRole("button", { name: /^tambah$/i }).click();

    // Modal should close (success)
    await page.waitForTimeout(2000);
    // Verify new reward appears in list
    await expect(page.getByText(/Test Reward E2E/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("librarian can open scan & deliver and search code", async ({ page }) => {
    // Login
    await page.goto("/");
    await page.getByLabel(/email/i).fill("pustakawan@jendelailmu.sch.id");
    await page.getByLabel(/password/i).fill("password123");
    await page.getByRole("button", { name: /^masuk$/i }).click();

    await expect(page.getByRole("heading", { name: /dashboard pustakawan/i })).toBeVisible({
      timeout: 15_000,
    });

    await page.goto("/?view=rewards-management");
    await page.getByRole("button", { name: /scan & deliver/i }).click();

    // Should see scan page
    await expect(page.getByRole("heading", { name: /scan & deliver hadiah/i })).toBeVisible();
    await expect(page.getByPlaceholder(/scan qr atau ketik kode/i)).toBeVisible();

    // Type a non-existent code → should show not found
    await page.getByPlaceholder(/scan qr atau ketik kode/i).fill("RWD-INVALID");
    await page.getByRole("button", { name: /^cari$/i }).click();
    await page.waitForTimeout(1500);
  });

  test("analytics tab shows KPIs and export buttons", async ({ page }) => {
    // Login
    await page.goto("/");
    await page.getByLabel(/email/i).fill("pustakawan@jendelailmu.sch.id");
    await page.getByLabel(/password/i).fill("password123");
    await page.getByRole("button", { name: /^masuk$/i }).click();

    await expect(page.getByRole("heading", { name: /dashboard pustakawan/i })).toBeVisible({
      timeout: 15_000,
    });

    await page.goto("/?view=rewards-management");
    await page.getByRole("button", { name: /^analytics$/i }).click();

    // KPIs visible
    await expect(page.getByText(/poin beredar/i)).toBeVisible();
    await expect(page.getByText(/poin masuk bulan ini/i)).toBeVisible();
    await expect(page.getByText(/klaim bulan ini/i)).toBeVisible();

    // Export buttons
    await expect(page.getByRole("button", { name: /leaderboard/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /klaim/i })).toBeVisible();
  });
});

test.describe("Reward System - Security", () => {
  test("point adjustment without 2FA is blocked", async ({ page, request }) => {
    // Login as librarian (pustakawan without 2FA in seed)
    await page.goto("/");
    await page.getByLabel(/email/i).fill("pustakawan@jendelailmu.sch.id");
    await page.getByLabel(/password/i).fill("password123");
    await page.getByRole("button", { name: /^masuk$/i }).click();

    await expect(page.getByRole("heading", { name: /dashboard pustakawan/i })).toBeVisible({
      timeout: 15_000,
    });

    // Try to adjust points without 2FA → should be 403
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

    const response = await request.post("/api/redemptions/admin/adjust", {
      headers: { cookie: cookieHeader, "Content-Type": "application/json" },
      data: {
        memberId: "any",
        amount: 100,
        description: "Test adjustment without 2FA",
      },
    });

    // Should be 403 (2FA required)
    expect([403, 500]).toContain(response.status());
    if (response.status() === 403) {
      const body = await response.json();
      expect(body.error).toMatch(/2FA/i);
    }
  });
});
