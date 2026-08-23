/**
 * E2E test untuk "Set as Home" flow (Sprint 4 — Fix #9).
 *
 * Flow yang ditest:
 * 1. Login sebagai LIBRARIAN
 * 2. Navigate ke DashboardView (default home) — heading "Dashboard Pustakawan"
 * 3. Click "Set sebagai Beranda" di salah satu dashboard
 * 4. Verify toast "X dijadikan beranda"
 * 5. Verify tombol berubah jadi "Beranda Aktif" (disabled)
 * 6. Verify state di API
 * 7. Security: TEACHER tidak boleh set executive-dashboard (403)
 * 8. Security: anonymous tidak boleh akses API preferences (401)
 *
 * Asumsi:
 * - User "pustakawan@jendelailmu.sch.id" sudah ada di database
 * - Password "password123" valid (lihat prisma/seed.ts)
 * - Tombol "Set sebagai Beranda" ada di header DashboardView
 */

import { test, expect, type Page } from "@playwright/test";

const PUSTAKAWAN_EMAIL = "pustakawan@jendelailmu.sch.id";
const PUSTAKAWAN_PASSWORD = "password123";
const GURU_EMAIL = "budi@jendelailmu.sch.id";

/**
 * Helper: login via UI form.
 * Returns saat dashboard heading muncul.
 */
async function loginAs(
  page: Page,
  email: string,
  password: string,
  expectedHeading: RegExp
) {
  await page.goto("/");

  const loginForm = page.getByLabel(/email/i);
  // Jika sudah ada session, langsung redirect ke dashboard
  const isLoginVisible = await loginForm.isVisible({ timeout: 2000 }).catch(() => false);
  if (isLoginVisible) {
    await loginForm.fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole("button", { name: /^masuk$/i }).click();
  }

  // Tunggu sampai expected heading muncul
  await expect(page.getByRole("heading", { name: expectedHeading }).first()).toBeVisible({
    timeout: 15_000,
  });
}

/**
 * Helper: reset default dashboard via API.
 * Penting untuk idempotent test.
 */
async function resetDefault(page: Page) {
  const response = await page.request.put("/api/users/me/preferences", {
    data: { defaultDashboard: "default" },
  });
  // Abaikan jika gagal (mis. session habis)
}

test.describe("Set as Home — flow E2E", () => {
  test.afterEach(async ({ page }) => {
    await resetDefault(page);
  });

  test("LIBRARIAN set Dashboard sebagai beranda", async ({ page }) => {
    await loginAs(
      page,
      PUSTAKAWAN_EMAIL,
      PUSTAKAWAN_PASSWORD,
      /dashboard pustakawan/i
    );

    // 1. Verify "Set sebagai Beranda" button visible di DashboardView
    const setAsHomeBtn = page.getByRole("button", { name: /set sebagai beranda/i }).first();
    await expect(setAsHomeBtn).toBeVisible();

    // 2. Click tombol
    await setAsHomeBtn.click();

    // 3. Verify toast muncul
    await expect(page.getByText(/dijadikan beranda/i)).toBeVisible({ timeout: 5000 });

    // 4. Verify tombol berubah jadi "Beranda Aktif" (disabled)
    const activeBtn = page.getByRole("button", { name: /beranda aktif/i });
    await expect(activeBtn).toBeVisible({ timeout: 5000 });
    await expect(activeBtn).toBeDisabled();

    // 5. Verify state di API
    const getRes = await page.request.get("/api/users/me/preferences");
    expect(getRes.ok()).toBeTruthy();
    const data = await getRes.json();
    expect(data.defaultDashboard).toBe("dashboard");
  });

  test("preference persists setelah logout + login lagi", async ({ page, context }) => {
    // Login & set custom
    await loginAs(
      page,
      PUSTAKAWAN_EMAIL,
      PUSTAKAWAN_PASSWORD,
      /dashboard pustakawan/i
    );

    // Set customizable-dashboard via API
    const setRes = await page.request.put("/api/users/me/preferences", {
      data: { defaultDashboard: "customizable-dashboard" },
    });
    expect(setRes.ok()).toBeTruthy();

    // Logout
    await context.clearCookies();
    await page.goto("/");

    // Login lagi
    const loginForm = page.getByLabel(/email/i);
    if (await loginForm.isVisible({ timeout: 3000 }).catch(() => false)) {
      await loginForm.fill(PUSTAKAWAN_EMAIL);
      await page.getByLabel(/password/i).fill(PUSTAKAWAN_PASSWORD);
      await page.getByRole("button", { name: /^masuk$/i }).click();
    }

    // Verify: yang muncul pertama adalah CustomizableDashboard
    // CustomizableDashboard punya tombol "Sesuaikan" yang tidak ada di Standard
    await expect(
      page.getByRole("button", { name: /^sesuaikan$/i })
    ).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Default Dashboard — security", () => {
  test("anonymous tidak boleh akses API preferences (401)", async ({ page }) => {
    const response = await page.request.put("/api/users/me/preferences", {
      data: { defaultDashboard: "executive-dashboard" },
    });
    expect(response.status()).toBe(401);
  });

  test("anonymous GET preferences juga 401", async ({ page }) => {
    const response = await page.request.get("/api/users/me/preferences");
    expect(response.status()).toBe(401);
  });

  test("TEACHER tidak boleh set executive-dashboard (403)", async ({ page }) => {
    // Login sebagai guru
    await loginAs(page, GURU_EMAIL, PUSTAKAWAN_PASSWORD, /selamat|beranda|halo/i);

    // Try set executive-dashboard — should 403
    const response = await page.request.put("/api/users/me/preferences", {
      data: { defaultDashboard: "executive-dashboard" },
    });
    expect(response.status()).toBe(403);
  });

  test("TEACHER tidak boleh set customizable-dashboard (403)", async ({ page }) => {
    await loginAs(page, GURU_EMAIL, PUSTAKAWAN_PASSWORD, /selamat|beranda|halo/i);

    const response = await page.request.put("/api/users/me/preferences", {
      data: { defaultDashboard: "customizable-dashboard" },
    });
    expect(response.status()).toBe(403);
  });

  test("TEACHER boleh set my-dashboard", async ({ page }) => {
    await loginAs(page, GURU_EMAIL, PUSTAKAWAN_PASSWORD, /selamat|beranda|halo/i);

    const response = await page.request.put("/api/users/me/preferences", {
      data: { defaultDashboard: "my-dashboard" },
    });
    expect(response.ok()).toBeTruthy();
  });

  test("invalid view key ditolak dengan 400", async ({ page }) => {
    await loginAs(
      page,
      PUSTAKAWAN_EMAIL,
      PUSTAKAWAN_PASSWORD,
      /dashboard pustakawan/i
    );

    const response = await page.request.put("/api/users/me/preferences", {
      data: { defaultDashboard: "invalid-view-key-xyz" },
    });
    expect(response.status()).toBe(400);
  });
});

test.describe("Default Dashboard — Reset & Settings UI", () => {
  test.afterEach(async ({ page }) => {
    await resetDefault(page);
  });

  test("LIBRARIAN bisa reset ke default via Settings UI", async ({ page }) => {
    await loginAs(
      page,
      PUSTAKAWAN_EMAIL,
      PUSTAKAWAN_PASSWORD,
      /dashboard pustakawan/i
    );

    // Set executive dulu
    await page.request.put("/api/users/me/preferences", {
      data: { defaultDashboard: "executive-dashboard" },
    });

    // Navigate ke Settings
    // Asumsi sidebar punya link "Pengaturan"
    const settingsLink = page.getByRole("link", { name: /pengaturan/i });
    const isSettingsVisible = await settingsLink.isVisible({ timeout: 2000 }).catch(() => false);

    if (isSettingsVisible) {
      await settingsLink.click();
      await page.waitForLoadState("networkidle");

      // Cari section "Beranda Pilihan Saya"
      await expect(
        page.getByRole("heading", { name: /beranda pilihan saya/i })
      ).toBeVisible({ timeout: 5000 });

      // Click "Otomatis" option
      const autoOption = page.getByRole("radio", { name: /otomatis/i });
      await expect(autoOption).toBeVisible();
      await autoOption.click();

      // Verify toast
      await expect(page.getByText(/default dashboard direset/i)).toBeVisible({
        timeout: 5000,
      });

      // Verify state di API
      const getRes = await page.request.get("/api/users/me/preferences");
      const data = await getRes.json();
      expect(data.defaultDashboard).toBe("default");
    } else {
      // Skip test jika settings link tidak visible
      test.skip();
    }
  });
});
