# Testing

Project menggunakan **Vitest** sebagai test framework. Tests fokus pada unit test untuk library functions dan helper utilities (pure functions, tidak butuh database).

## Setup

```bash
bun install
bun run test
```

## Struktur

```
tests/
├── setup.ts                    # Global test setup (env vars, mocks)
├── unit/                       # (reserved for future integration tests)
src/lib/__tests__/
├── rate-limit.test.ts          # Rate limiter
├── temp-token.test.ts          # JWT temporary tokens (2FA, reset)
├── two-factor.test.ts          # TOTP 2FA
├── whatsapp.test.ts            # WA templates & phone normalization
├── constants.test.ts           # formatters, date math, fine calculation
├── api-auth.test.ts            # API key generation
├── auth.test.ts                # RBAC helpers (isLibrarian, isFullLibrarian)
├── client-error.test.ts        # Client-side error reporting
├── loan-rules.test.ts          # Holiday-aware due date
├── email.test.ts               # Email templates
├── scheduler.test.ts           # Smart reminder logic (mocked DB)
├── api-client.test.ts          # API client wrapper
└── error-tracker.test.ts       # Error tracking + withErrorTracking wrapper
```

## Coverage

Run with coverage:

```bash
bun run test:coverage
```

Coverage report akan di-generate di `coverage/index.html`.

## Test Stats

- **13 test files**
- **~200+ test cases**
- **Target coverage**: 60% lines/functions, 50% branches untuk library files

## Convention

- File naming: `<lib-name>.test.ts`
- `describe` block per function/feature
- `it` block per test case
- Bahasa Indonesia untuk describe/it (sesuai konvensi project)
- Test cases pure functions only — components & DB-heavy logic via integration test terpisah
