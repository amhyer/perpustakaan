# Task 7 — Circulation, Loans, Reservations Views

**Agent:** Z.ai Code (view-builder agent)
**Task ID:** 7
**Date:** 2025-08

## What I did

Created 3 librarian-facing view components for the "Perpustakaan Jendela Ilmu" Next.js 16 app:

1. **`src/components/app/views/circulation-view.tsx`** — `CirculationView`
   - PageHeader (icon `ScanLine`).
   - Two cards side-by-side (responsive stack on mobile):
     - **Pinjam Buku**: Step 1 = debounced member search input with dropdown (fetches `/api/members?q=`), member info chip showing name, number, category badge, kuota info from `LOAN_RULES`, plus active loans list with overdue warning. Step 2 = debounced book search input with dropdown (fetches `/api/books?q=`), available-eksemplar `<Select>`, loan rule info, "Proses Peminjaman" button → `POST /api/loans` → toast with due date + clears book selection + refetch member loans.
     - **Kembalikan Buku**: member search → active loans list (each card: BookCover sm, title, author, due date, status badge, fine if overdue) + total fine badge → per-loan "Kembalikan" button → AlertDialog confirm → `PUT /api/loans/${id}/return` → toast with fine info, next-reservation notice.
   - Shared inline components: `MemberSearchInput`, `BookSearchInput`, `ActiveLoansList`.
   - Loading states, error toasts, empty states.

2. **`src/components/app/views/loans-view.tsx`** — `LoansView`
   - PageHeader (icon `ClipboardList`).
   - 3 StatCards (Total Peminjaman, Sedang Dipinjam, Terlambat) derived from `/api/loans` (all).
   - Filter Tabs: Semua | Aktif (`status=LOANED`) | Terlambat (`overdue=1`) | Dikembalikan (`status=RETURNED`).
   - Search input (client-side filter on member name/number + book title/author).
   - shadcn Table inside `max-h-[600px] overflow-y-auto scrollbar-thin`, sticky header. Columns: Anggota (name+number+category), Buku (title+author), Tgl Pinjam, Jatuh Tempo, Kembali, Status badge, Denda, Aksi.
   - Overdue rows tinted `bg-red-50 dark:bg-red-950/20`.
   - Aksi: "Kembalikan" (only when LOANED/OVERDUE, destructive variant when overdue) → AlertDialog → `PUT /api/loans/${id}/return`. "Detail" → `setView("member-detail", { id })`.
   - Loading skeleton, empty state.

3. **`src/components/app/views/reservations-view.tsx`** — `ReservationsView`
   - PageHeader (icon `BookMarked`).
   - 3 StatCards (Total Reservasi, Siap Diambil, Mengantre).
   - Filter Tabs: Semua | Mengantre (PENDING) | Siap Diambil (READY) | Selesai (FULFILLED + CANCELLED + EXPIRED). Client-side filtering.
   - Search input.
   - Grid of reservation Cards (max-h-[700px] overflow-y-auto scrollbar-thin). Each: BookCover sm + title + author, status badge, queue order (# for PENDING), member name + number + category badge + classGrade, reserved date, expires-at (red if past) for READY, note block.
   - Actions: "Lihat Buku" → `setView("book-detail", { id })`. "Tandai Diambil" (only READY, emerald button) → AlertDialog → `PUT /api/reservations` `{ id, action: "fulfill" }`. "Batalkan" (PENDING/READY) → AlertDialog → `PUT /api/reservations` `{ id, action: "cancel" }`.
   - Loading skeletons, empty state.

## Conventions followed
- All 3 files start with `"use client";`.
- Imports via `@/` alias.
- shadcn/ui components from `@/components/ui/`.
- Shared components from `@/components/app/shared/` (PageHeader, EmptyState, StatCard, BookCover, Spinner).
- `useFetch` hook + `api.post/put` from `@/lib/api-client`.
- Constants/helpers from `@/lib/constants` (LOAN_RULES, LOAN_STATUS_LABELS/COLORS, RESERVATION_STATUS_LABELS, ROLE_LABELS/COLORS, formatRupiah, formatDate, formatDateShort, calculateFine).
- `useAppStore` for navigation (`setView("member-detail"/"book-detail", { id })` — using `id` key as page.tsx expects).
- `toast` from sonner.
- Lucide icons.
- Card p-4/p-6; long lists use `max-h-* overflow-y-auto scrollbar-thin`.
- Bahasa Indonesia throughout.
- Footer handled by AppShell (none added).

## Lint status
- `bun run lint` → 0 errors in my 3 files. (1 pre-existing warning in `use-fetch.ts`, not mine.)
- TypeScript typecheck (`tsc --noEmit`) → no errors in my 3 files. (Other view files like `my-loans-view` still missing — not my task.)

## Implementation notes
- Lint rule `react-hooks/set-state-in-effect` forbids synchronous `setState` inside `useEffect` body. Fixed by:
  - Moving debounced search setState (`setResults`/`setLoading`/`setOpen`) into `setTimeout` callback.
  - Replacing "reset state when X changes" effects with explicit handlers (`handleBorrowMemberSelect`, `handleBorrowBookSelect`) called from `onSelect`.
- Dropdown visibility gated on `query.trim().length >= 2` in render instead of clearing state in effect.
- Auto-select first available eksemplar via handler (not effect) when book is picked.
- Loans API dynamically returns OVERDUE status & fine; views simply display what's returned.
- Reservations view fetches all and filters client-side because API only accepts single `status` param but the "Selesai" tab needs OR over FULFILLED/CANCELLED/EXPIRED.

## Stage Summary
Three production-ready librarian views for circulation desk, loan data table, and reservation queue management. All wire up to existing API routes (`/api/members`, `/api/books`, `/api/loans` + `/return`, `/api/reservations`). Ready for integration with the rest of the app once sibling view files land.
