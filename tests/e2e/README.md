# E2E Tests (Playwright)

End-to-end tests untuk verify critical user flows di browser.

## Setup

```bash
# Install Playwright
bun add -d @playwright/test

# Install browser
bunx playwright install chromium

# Run tests (need dev server running)
bunx playwright test

# Run with UI
bunx playwright test --ui

# Generate tests
bunx playwright codegen http://localhost:3001
```

## Test Files

| File | Scope |
|---|---|
| `auth.spec.ts` | Login, logout, forgot password |
| `navigation.spec.ts` | Sidebar, search, responsive |
| `circulation.spec.ts` | Peminjaman flow (critical) |
| `catalog.spec.ts` | OPAC untuk siswa |
| `pwa.spec.ts` | Install prompt, offline mode |

## Convention

- Gunakan `test.describe()` untuk grouping
- `test.beforeEach()` untuk setup (login, dll)
- `await expect(...).toBeVisible()` untuk assertions
- Pakai `data-testid` untuk elements yang sering di-test
- Hindari `waitForTimeout` — pakai `waitForResponse` atau `waitForSelector`

## CI/CD

E2E tests di-run setelah unit tests lulus. Browser binaries di-cache untuk speed.

## Debugging

```bash
# Run single test
bunx playwright test auth.spec.ts

# With debug mode
bunx playwright test --debug

# Show report
bunx playwright show-report
```
