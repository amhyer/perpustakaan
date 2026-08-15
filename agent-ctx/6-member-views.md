# Task ID: 6 — Agent: Member Views Developer

## Files Created
1. `src/components/app/views/members-view.tsx` — Member management list (LIBRARIAN view)
2. `src/components/app/views/member-detail-view.tsx` — Member detail with 3 tabs (Profil, Riwayat Peminjaman, Kartu Anggota)
3. `src/components/app/views/my-card-view.tsx` — Digital member card with QR + premium presentation

## What I Did

### members-view.tsx
- PageHeader with title "Manajemen Anggota" + "Tambah Anggota" action button.
- Stats row (4 StatCards): Total Anggota (Users), Siswa (GraduationCap), Guru (BookMarked), Anggota Aktif (UserCheck) from `/api/stats` -> `overview`.
- Search bar (q by fullName/memberNumber/phone/classGrade) + filter by category (Semua/Pustakawan/Guru/Siswa) + filter by status (Semua/Aktif/Nonaktif).
- Responsive shadcn Table (overflow-x-auto + scrollbar-thin on mobile). Each row: avatar initials, fullName + email, memberNumber (mono), category badge (ROLE_COLORS), classGrade, status badge, _count.loans chip, "Lihat Detail" button -> `setView("member-detail", {id})`.
- Loading skeleton (6 rows), empty state, error state with retry.
- Add Dialog form (2-col grid): email*, password*, name*, fullName*, memberNumber* (auto-suggest format `LIB/TCH/STD-YYYY-XXX` based on role), role select, gender, phone, address, classGrade, birthDate (date), expiryDate (date). Submit `POST /api/members`. On success toast + refetch + close. Submitting state with spinner.
- `useFetch` for members with `deps: [membersUrl]` so search/filter triggers refetch.

### member-detail-view.tsx
- Fetch `/api/members/${memberId}` (full member with relations).
- PageHeader: member fullName + email. Back button -> `setView("members")`. Prominent "Cetak Kartu" button (window.print()).
- Member identity badges: memberNumber (mono), role badge (ROLE_COLORS), status badge.
- Tabs (3):
  - **Profil**: Card with 32x32 avatar (initials/photo), 2-col grid of InfoItems (memberNumber, email, status, gender, birthDate, classGrade, phone, joinDate, expiryDate, total loans, address). Buttons: "Edit Data" (Dialog PUT form), "Reset Password" (Dialog), "Nonaktifkan/Aktifkan" (toggle PUT {status}).
  - **Riwayat Peminjaman**: Table in `max-h-96 overflow-y-auto scrollbar-thin` with sticky header. Columns: title+author, loanDate, dueDate, returnDate, status badge (LOAN_STATUS_*), fine (formatRupiah, with "Lunas"/"Belum bayar").
  - **Kartu Anggota**: `<MemberCardPrint member={member} />` preview + "Cetak Kartu" button (window.print()).
- Edit Dialog: 2-col form with fullName, email, category select, gender select, phone, classGrade, birthDate, expiryDate, address. Submit `PUT /api/members/${id}`.
- Reset Password Dialog: simple new password field. Submit `PUT /api/members/${id}` with `{password}`.
- Loading spinner, error empty state with retry.
- All print buttons have `no-print` class so they hide when printing.

### my-card-view.tsx
- Get user from `useAppStore(s => s.user)`. If no `user.member`, show empty state "Anda belum terdaftar sebagai anggota".
- Fetch `/api/members/${user.member.id}` for joinDate, expiryDate, status, etc.
- PageHeader: "Kartu Anggota Digital" + "Cetak Kartu" action button (window.print).
- Status banner (green for ACTIVE, amber for INACTIVE) with animated ping dot for active.
- Premium presentation: gradient + window-pattern background, glow shadow behind the MemberCardPrint card.
- QR Code section: large QrCode (200px) with JSON value `{t, id, no, name, cat}`. Text "Scan QR ini di perpustakaan untuk verifikasi cepat".
- "Simpan ke HP" hint card: "Screenshot kartu ini dan simpan di galeri HP Anda untuk akses cepat."
- Info tiles row (4): Nomor Anggota (mono), Kategori (ROLE_LABELS), Bergabung (formatDate), Berlaku s/d (formatDate or "Tanpa batas").
- Loading spinner, error empty state.

## Conventions Followed
- All `"use client"` at top.
- All imports use `@/` alias.
- All text in Bahasa Indonesia.
- shadcn/ui components used (Button, Input, Label, Badge, Card, Avatar, Table, Dialog, Select, Textarea, Tabs).
- lucide-react icons used throughout.
- `toast` from sonner.
- Card padding `p-4`/`p-6`; long lists use `max-h-96 overflow-y-auto scrollbar-thin`.
- `useFetch` from `@/hooks/use-fetch` with `deps` for refetch-on-filter-change.
- `api` from `@/lib/api-client` for mutations.
- `useAppStore` for view navigation (`setView`).
- Used shared components: PageHeader, EmptyState, StatCard, Spinner, MemberCardPrint, QrCode.
- Used constants: ROLE_LABELS, ROLE_COLORS, MEMBER_STATUS_LABELS, LOAN_STATUS_LABELS, LOAN_STATUS_COLORS, formatDate, formatRupiah, LIBRARY_NAME.
- Responsive (mobile-first, `sm:`/`md:`/`lg:` prefixes).
- Used `no-print` class on interactive buttons to hide during print.

## Lint & TypeScript Status
- `bun run lint`: my 3 files have ZERO errors. (Only errors in circulation-view.tsx — another agent's file.)
- `tsc --noEmit`: my 3 files have ZERO type errors. (Errors only in other files unrelated to this task.)

## Stage Summary
Three production-ready view components for the member management flow:
1. **MembersView** — Librarian list view with search/filter, stats, and add-member dialog.
2. **MemberDetailView** — Full detail with tabs for profile, loan history, and printable card; edit + reset password + status toggle.
3. **MyCardView** — Premium digital member card with QR code, status indicator, and print support for TEACHER/STUDENT/LIBRARIAN.

All views follow the project conventions exactly: useFetch for reads, api-client for mutations, useAppStore for navigation, shared components, shadcn/ui, and consistent Bahasa Indonesia labels.
