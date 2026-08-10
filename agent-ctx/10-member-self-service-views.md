# Task 10 — Member Self-Service Views

**Agent:** Member Self-Service Views Developer (Z.ai Code)
**Date:** 2025-08
**Task ID:** 10

## Files Created

1. `src/components/app/views/my-dashboard-view.tsx` — `MyDashboardView`
2. `src/components/app/views/my-loans-view.tsx` — `MyLoansView`
3. `src/components/app/views/wishlist-view.tsx` — `WishlistView`
4. `src/components/app/views/notifications-view.tsx` — `NotificationsView`

## What Was Done

### my-dashboard-view.tsx
- Personal home/beranda for TEACHER & STUDENT after login.
- Empty state when `user.member` is null.
- Fetches: `/api/loans?mine=1`, `/api/announcements`, `/api/wishlist?mine=1`, `/api/books?limit=5`.
- Welcome banner: gradient primary card, greeting by time-of-day (`greetingByTime()` returns "Selamat pagi/siang/sore/malam"), memberNumber mono, ROLE_COLORS badge, LIBRARY_TAGLINE, quota "X / Y buku" using `LOAN_RULES[user.member.category].maxBooks` with `<Progress>`.
- 4 StatCards: Sedang Dipinjam (BookOpen, sky), Jatuh Tempo Minggu Ini (Clock, amber), Denda (Wallet, red if >0, formatRupiah, calculated via `calculateFine`), Wishlist (BookHeart, violet).
- Two-column layout: Left (lg:col-span-2) active loans list (mini BookCover + title + author + due countdown + Perpanjang button → `PUT /api/loans/{id}/renew`); Right announcements top-3 (pinned first) + "Lihat Semua" → setView("announcements") + mini Kartu Anggota card → setView("my-card").
- Recommended books "Mungkin Kamu Suka" horizontal scroll `<BookCard>`.
- Loading skeletons everywhere, responsive stack-on-mobile.
- `dueCountdown()` helper returns { text, tone: "ok"|"warn"|"danger" }.

### my-loans-view.tsx
- PageHeader "Pinjamanku" + description.
- 3 StatCards: Sedang Dipinjam, Terlambat, Total Riwayat.
- Filter Tabs: Aktif | Terlambat | Riwayat (returned).
- Loans as Cards (NOT table) for friendlier student UX.
- Each card: mini BookCover, title, author, grid (Pinjam/Jatuh Tempo/Dikembalikan), countdown badge, LOAN_STATUS_LABELS/COLORS badge, fine box (formatRupiah if any), renewedCount chip.
- Actions per active/overdue loan: "Perpanjang" (PUT /api/loans/{id}/renew, disabled when renewedCount >= maxRenewals), "Lihat Buku" → setView("book-detail",{id}).
- Overdue: red border + tinted bg + note "Kembalikan segera untuk menghentikan akumulasi denda".
- Returned: shows returnDate + finePaid status.
- Empty states per tab. Help note "Butuh bantuan?" at bottom. Loading skeleton.

### wishlist-view.tsx
- PageHeader "Wishlist Favorit".
- 3 StatCards (Total / Mau Baca / Aksi Cepat).
- Grid of `<BookCard>` responsive (2/3/4/5 cols).
- "Hapus" overlay button (Trash2) on hover (desktop) + always-visible button on mobile → DELETE `/api/wishlist?bookId=xxx` → toast + refetch.
- Empty state "Wishlist masih kosong" + "Jelajahi Katalog" → setView("catalog").
- LoadingGrid skeleton.
- Uses `BookWithDetails` type from shared book-card.

### notifications-view.tsx
- PageHeader "Notifikasi" + action "Tandai Semua Dibaca" (POST /api/notifications?action=read {all:true}) — only shown if unread > 0.
- 3 StatCards (Total / Belum Dibaca / Status).
- Tabs filter: Semua | Belum Dibaca (with badge counts).
- List Cards per notification: icon per type (INFO=Info sky, WARNING=AlertTriangle amber, OVERDUE=AlertCircle red, DUE_DATE=Clock orange, ANNOUNCEMENT=Megaphone primary), title bold, message, relative time, unread dot indicator + tinted bg.
- Click notification → POST /api/notifications?action=read {id} → refetch.
- `relativeTime()` helper: "Baru saja" / "X menit lalu" / "X jam lalu" / "X hari lalu" / `formatDate`.
- List `max-h-[700px] overflow-y-auto scrollbar-thin`. Empty state per filter.
- Footer helper card "Tentang Notifikasi".

## Conventions Followed

- `"use client";` at top of every file.
- `@/` import alias throughout.
- `useFetch` from `@/hooks/use-fetch` for data fetching.
- `api` from `@/lib/api-client` for mutations (post/put/delete).
- `useAppStore` for navigation (`setView`).
- Shared components: PageHeader, EmptyState, StatCard, BookCover, BookCard, LoadingGrid, Spinner.
- shadcn/ui: Button, Card, Badge, Tabs, Progress.
- lucide-react icons (BookOpen, Clock, Wallet, BookHeart, RotateCw, Loader2, ArrowRight, Megaphone, Pin, Sparkles, CreditCard, AlertTriangle, AlertCircle, Info, Bell, BellOff, CheckCheck, History, BookMarked, CalendarClock, CalendarCheck, Trash2, HeartCrack).
- sonner toast for feedback.
- All text in Bahasa Indonesia (friendly, simple).
- Responsive mobile-first. Card padding `p-4`/`p-6`. Long lists `max-h-* overflow-y-auto scrollbar-thin`.
- No new routes or API endpoints. No tests.

## Lint & TypeScript Status

- `bun run lint` → 0 errors and 0 warnings in the 4 created files. (Only 1 pre-existing warning in `src/hooks/use-fetch.ts` — not part of this task.)
- `bunx tsc --noEmit` → no errors in the 4 created files.

## API Endpoints Used (all pre-existing)

- `GET /api/loans?mine=1` — current user's loans
- `PUT /api/loans/{id}/renew` — renew a loan
- `GET /api/announcements` — list announcements
- `GET /api/wishlist?mine=1` — current user's wishlist
- `DELETE /api/wishlist?bookId=xxx` — remove from wishlist
- `GET /api/notifications` — list user's notifications
- `POST /api/notifications?action=read` body `{ id }` or `{ all: true }` — mark as read
- `GET /api/books?limit=5` — recommended books

## Integration with Store

ViewKey navigations used:
- `setView("catalog")` — explore catalog (from empty states / "Lihat Katalog" buttons)
- `setView("book-detail", { id })` — view book detail (clickable covers, titles, "Lihat Buku" buttons)
- `setView("announcements")` — view all announcements
- `setView("my-card")` — view digital member card
- `setView("my-loans")` — view all own loans (from dashboard "Lihat Semua")
