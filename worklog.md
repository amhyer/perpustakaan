# Worklog — Perpustakaan Jendela Ilmu

---
Task ID: 1-4
Agent: Main (Z.ai Code)
Task: Foundation, infrastructure, API routes, shared components

Work Log:
- Install paket: qrcode.react, bcryptjs, jose, recharts
- Prisma schema lengkap: User, Member, Category, Location, Book, BookItem, Loan, Reservation, Wishlist, BookProposal, Announcement, Notification, Setting
- db:push + db:generate sukses (SQLite)
- Seed data: 15 buku (gradient covers), 7 anggota (1 pustakawan, 2 guru, 4 siswa), 8 kategori, 6 rak, ~12 transaksi peminjaman, reservasi, usulan, pengumuman, notifikasi
- Auth: JWT via jose, httpOnly cookie, bcrypt; API /api/auth/login|logout|me
- API routes lengkap: books(+items), categories, locations, members, loans(+return+renew), reservations, wishlist, proposals, announcements, stats, notifications, settings, upload
- Design tokens: palet hangat akademis (biru tua primary, hijau daun accent, krem background) di globals.css; sidebar gelap
- Shared components: Logo (buku+jendela SVG), BookCover (gradient), BookCard, StatCard, PageHeader, EmptyState, LoadingGrid, QrCode, MemberCardPrint
- Layout: AppShell (sidebar+header+sticky footer), Sidebar (role-based nav), Header (search+notif+user menu), LoginScreen (split panel brand + form + demo accounts)
- Zustand store: user, view (key+params), sidebar, refreshKey
- useFetch hook, api-client, page.tsx (auth gate + view router)

Stage Summary:
- Stack: Next.js 16 App Router, TS, Tailwind 4, shadcn/ui, Prisma/SQLite, Zustand, jose JWT
- Akun demo: pustakawan@jendelailmu.sch.id / budi@jendelailmu.sch.id / andini@jendelailmu.sch.id (password: password123)
- Semua API route pakai `requireAuth()` / `requireRole()` dari `@/lib/auth`
- Layout sudah responsive + sticky footer

# KONVENSI PENULISAN VIEW (WAJIB DIIKUTI SEMUA AGENT)

File lokasi: `src/components/app/views/<nama>-view.tsx`
Export: named export sesuai, mis. `export function CatalogView()`.
Semua view WAJIB `"use client"` di baris pertama.

## Data fetching
Gunakan hook `useFetch` dari `@/hooks/use-fetch`:
```tsx
import { useFetch } from "@/hooks/use-fetch";
const { data, loading, error, refetch } = useFetch<MyType[]>(`/api/xxx`);
```
- url bisa `null` untuk skip
- `deps` untuk refetch saat berubah (mis. filter)
- `refetch()` untuk refresh manual setelah mutasi

## Mutasi (POST/PUT/DELETE)
Gunakan `api` dari `@/lib/api-client`:
```tsx
import { api } from "@/lib/api-client";
await api.post("/api/xxx", body);
await api.put("/api/xxx", body);
await api.delete("/api/xxx");
```
Setelah sukses: `toast.success("...")` lalu `refetch()` atau `setView(...)`.
Error: `toast.error(err.message)`.

## Navigasi
```tsx
import { useAppStore } from "@/store/use-app-store";
const setView = useAppStore((s) => s.setView);
setView("book-detail", { id: book.id });
```
ViewKey tersedia: dashboard, catalog, book-detail, book-form, members, member-detail, circulation, loans, reservations, proposals, announcements, reports, settings, my-dashboard, my-loans, my-card, wishlist, notifications

## Komponen shared (sudah ada, GUNAKAN)
- `BookCard` from `@/components/app/shared/book-card` (props: { book }) — kartu buku dengan cover gradient
- `BookCover` from `@/components/app/shared/book-cover` (props: { title, author, color, size })
- `StatCard` from `@/components/app/shared/stat-card` (props: { label, value, icon, color, trend, subtitle })
- `PageHeader, EmptyState` from `@/components/app/shared/page-header`
- `LoadingGrid, Spinner` from `@/components/app/shared/loading`
- `QrCode` from `@/components/app/shared/qr-code` (props: { value, size, fgColor })
- `MemberCardPrint` from `@/components/app/shared/member-card-print` (props: { member })

## shadcn/ui (sudah ada semua di src/components/ui/)
Button, Card, Input, Label, Badge, Table, Dialog, Select, Tabs, Textarea, Avatar, DropdownMenu, Sheet, AlertDialog, Checkbox, Switch, Progress, Separator, Tooltip, ScrollArea, Command, Popover, Calendar, dll.

## Ikon: lucide-react

## Konstanta & helper dari `@/lib/constants`
- ROLE_LABELS, ROLE_COLORS
- ITEM_STATUS, ITEM_STATUS_LABELS, ITEM_STATUS_COLORS
- LOAN_STATUS, LOAN_STATUS_LABELS, LOAN_STATUS_COLORS
- RESERVATION_STATUS_LABELS, PROPOSAL_STATUS_LABELS, PROPOSAL_STATUS_COLORS
- MEMBER_STATUS_LABELS
- LOAN_RULES (per kategori: maxBooks, loanDays, finePerDay, maxRenewals)
- COVER_COLORS (array hex)
- LIBRARY_NAME, LIBRARY_TAGLINE, HEAD_LIBRARIAN_NAME
- formatRupiah(n), formatDate(d), formatDateShort(d), daysBetween(a,b), calculateFine(due,ret,finePerDay)

## Bahasa: SEMUA label & pesan dalam Bahasa Indonesia sederhana.
## Style: card konsisten (p-4/p-6), list panjang pakai `max-h-96 overflow-y-auto scrollbar-thin`.
## Footer: SUDAH sticky via AppShell, jangan tambah footer lain di view.
## Jangan buat route/halaman baru. Semua view dirender oleh page.tsx via store.

## User saat ini (role check)
```tsx
const user = useAppStore((s) => s.user);
// user.role: "LIBRARIAN" | "TEACHER" | "STUDENT"
// user.member: { id, memberNumber, fullName, category, photo, classGrade } | null
```

## Tipe data umum ( dari API )
Book: { id, title, author, publisher, isbn, year, pages, synopsis, coverImage, coverColor, language, subject, category:{name}, location:{name,code}, items:[{id,status,itemCode,condition}] }
Member: { id, memberNumber, fullName, category, status, gender, birthDate, phone, address, photo, classGrade, joinDate, expiryDate, user:{email,role} }
Loan: { id, memberId, bookItemId, bookId, loanDate, dueDate, returnDate, status, fineAmount, finePaid, renewedCount, member:{...}, bookItem:{book:{title,author,coverColor,coverImage}} }

---
Task ID: 6
Agent: Member Views Developer (Z.ai Code)
Work Log:
- Created 3 view files for the member management flow:
  1. `src/components/app/views/members-view.tsx` — Librarian member list with search/filter, 4 StatCards (Total/Siswa/Guru/Aktif) from `/api/stats`, responsive shadcn Table (overflow-x-auto + scrollbar-thin) with avatar initials, memberNumber (mono), category badge (ROLE_COLORS), status badge, _count.loans chip, "Lihat Detail" action, loading skeleton, empty/error states, and full Add-Member Dialog form (email/password/name/fullName/memberNumber auto-suggest `LIB|TCH|STD-YYYY-XXX`/role/gender/phone/address/classGrade/birthDate/expiryDate → POST /api/members).
  2. `src/components/app/views/member-detail-view.tsx` — Full member detail with 3 Tabs: (a) Profil = info grid + Edit Dialog (PUT) + Reset Password Dialog (PUT {password}) + Nonaktifkan/Aktifkan toggle (PUT {status}); (b) Riwayat Peminjaman = Table in `max-h-96 overflow-y-auto scrollbar-thin` with sticky header (judul/tgl pinjam/jatuh tempo/dikembalikan/status/denda formatRupiah); (c) Kartu Anggota = `<MemberCardPrint>` preview + window.print(). Back button → setView("members").
  3. `src/components/app/views/my-card-view.tsx` — Premium digital card for TEACHER/STUDENT/LIBRARIAN: status banner (green ACTIVE / amber INACTIVE) with animated ping dot, gradient + window-pattern background with glow shadow behind MemberCardPrint, large QrCode (size 200) with JSON {t,id,no,name,cat} + "Scan QR ini di perpustakaan", "Simpan ke HP" hint, 4 InfoTiles (Nomor Anggota, Kategori ROLE_LABELS, Bergabung formatDate, Berlaku s/d formatDate). Print button + `no-print` class on interactive elements.
- Followed all KONVENSI PENULISAN VIEW rules: `"use client"` at top, `@/` alias imports, useFetch with deps, api-client for mutations, useAppStore for navigation, shared components (PageHeader/EmptyState/StatCard/Spinner/MemberCardPrint/QrCode), shadcn/ui (Button/Input/Label/Badge/Card/Avatar/Table/Dialog/Select/Textarea/Tabs), sonner toast, all text in Bahasa Indonesia, responsive mobile-first, `p-4`/`p-6` card padding, `max-h-96 overflow-y-auto scrollbar-thin` for long lists.
- Lint status: my 3 files have ZERO errors (`bun run lint` clean for these files). TypeScript check clean for these files.

Stage Summary:
Member management views complete. Librarian can list/search/filter/add members, view full detail with profile/loan-history/card tabs, edit/reset password/toggle status, and print cards. Members can view a premium digital card with QR code and printable layout. Files are production-ready and integrate cleanly with the existing shared components, store, API routes, and constants.

---
Task ID: 5
Agent: Book Views Agent (Z.ai Code)

Work Log:
- Membaca worklog & semua shared components (BookCard, BookCover, PageHeader, EmptyState, LoadingGrid, Spinner), store, useFetch, api-client, constants, API routes (books, books/[id], categories, locations, loans, reservations, wishlist, upload).
- FILE 1: `src/components/app/views/catalog-view.tsx` — OPAC untuk semua role. Search bar besar dengan debounce 300ms (state `searchInput` → `searchQuery`), tombol Filter toggle untuk sidebar kategori/lokasi/tahun + Reset, Sort dropdown (Judul A-Z / Judul Z-A / Terbaru, client-side), tombol "Tambah Buku" hanya untuk LIBRARIAN → `setView("book-form")`, grid responsif (2 mobile / 3 / 4 / 5 desktop) `<BookCard>`, `<LoadingGrid>` saat loading, `<EmptyState icon={BookOpen}>` saat kosong, badge jumlah filter aktif, count "Menampilkan X buku", baca `view.params.q` sebagai initial query, gunakan `useFetch` dengan deps URL.
- FILE 2: `src/components/app/views/book-detail-view.tsx` — Detail buku dua kolom (cover `lg` sticky kiri 280px, details kanan). Header: badges kategori/tahun/bahasa, h1 judul, author. Tombol aksi peran: STUDENT/TEACHER → "Pinjam Buku" (POST `/api/loans` dengan firstAvailableItem.id, fallback "Reservasi" bila stok 0), Wishlist toggle (GET `/api/wishlist?mine=1` lalu POST/DELETE), LIBRARIAN → "Edit Buku" (`setView("book-form",{id})`) + "Hapus Buku" (AlertDialog konfirmasi → DELETE lalu `setView("catalog")`). Card informasi metadata (pengarang, penerbit, tahun, ISBN, halaman, bahasa, subjek, lokasi+MapPin). Card sinopsis (whitespace-pre-line). Card ketersediaan eksemplar: list scroll `max-h-96 scrollbar-thin` dengan `ITEM_STATUS_LABELS`+`ITEM_STATUS_COLORS`, badge "X dari Y tersedia". Card antrian reservasi bila ada. Loading: Spinner; Error: Card friendly dengan tombol kembali. Semua feedback via `toast` sonner.
- FILE 3: `src/components/app/views/book-form-view.tsx` — Form tambah/edit (LIBRARIAN ONLY). Guard: bila `user.role !== "LIBRARIAN"` tampilkan Card "Akses Ditolak" dengan tombol kembali. PageHeader dinamis ("Tambah Buku Baru" / "Edit Buku"). Field: title*, author*, publisher, isbn, year (number), pages (number), language (default "Indonesia"), subject, synopsis (Textarea), categoryId (Select `/api/categories`), locationId (Select `/api/locations`), coverColor (row swatches dari `COVER_COLORS`), coverImage upload (file input → POST `/api/upload` FormData → set URL + thumbnail preview + tombol hapus), itemCount (number default 3, HANYA create mode). Live preview sticky: `<BookCover size="md">` yang update real-time saat title/author/color berubah (atau `<img>` bila coverImage di-set). Submit POST `/api/books` (create) atau PUT `/api/books/${bookId}` (edit) → toast + `setView("book-detail",{id})`. Validasi title & author required (toast error bila kosong). Loading state tombol submit (Loader2 spinner). Prefill semua field via useEffect saat data existingBook tersedia. State plain useState (FormState object).
- Lint: ketiga file lolos tanpa error/warning (sebelumnya ada 2 unused eslint-disable `@next/next/no-img-element` di book-form-view — sudah dihapus). Catatan: lint project masih menampilkan error di `circulation-view.tsx` (file agent lain) dan warning di `use-fetch.ts` — bukan tanggung jawab task ini.
- TypeScript: ketiga file lolos `tsc --noEmit` tanpa error (error yang muncul hanya untuk file agent lain / examples / chart.tsx).

Stage Summary:
- 3 view komponen siap pakai, mengikuti konvensi worklog (`useFetch` + `api` + `useAppStore` + shared components + shadcn/ui + sonner toast).
- Semua label & pesan dalam Bahasa Indonesia.
- Responsif mobile-first, card padding p-4/p-6, list panjang pakai `max-h-96 overflow-y-auto scrollbar-thin`.
- Navigasi: `setView("catalog" | "book-detail" | "book-form")` dengan params `{ id }` / `{ q }`.
- Tidak membuat route/API baru — hanya 3 file view sesuai instruksi.

---
Task ID: 7
Agent: Z.ai Code (view-builder — circulation/loans/reservations)
Tanggal: 2025-08

Work Log:
- Membuat 3 view librarian di `src/components/app/views/`:
  1. `circulation-view.tsx` (`CirculationView`) — layanan sirkulasi: kartu "Pinjam Buku" + kartu "Kembalikan Buku" berdampingan (responsive stack). Member search debounce (dropdown hasil) + book search debounce + pilih eksemplar + tombol "Proses Peminjaman" → POST /api/loans. Kartu pengembalian: list pinjaman aktif anggota, tombol per-loan → AlertDialog konfirmasi → PUT /api/loans/{id}/return. Pakai LOAN_RULES, formatRupiah, formatDate, BookCover sm, Badge status, Badge denda.
  2. `loans-view.tsx` (`LoansView`) — tabel data peminjaman: 3 StatCards (Total/Sedang Dipinjam/Terlambat), Tabs filter (Semua/Aktif/Terlambat/Dikembalikan), search input, shadcn Table sticky-header `max-h-[600px] overflow-y-auto scrollbar-thin`. Kolom: Anggota, Buku, Tgl Pinjam, Jatuh Tempo, Kembali, Status, Denda, Aksi. Baris overdue di-tint `bg-red-50 dark:bg-red-950/20`. Aksi: Kembalikan (AlertDialog) + Detail Anggota (setView member-detail).
  3. `reservations-view.tsx` (`ReservationsView`) — grid Card reservasi: 3 StatCards, Tabs filter (Semua/Mengantre/Siap Diambil/Selesai), search, kartu per reservasi (cover sm + title + author + status badge + queue order # + member chip + reservedAt + expiresAt + note). Aksi: Lihat Buku (setView book-detail), Tandai Diambil (PUT /api/reservations {action:"fulfill"}), Batalkan (PUT /api/reservations {action:"cancel"}).
- Semua file `"use client"`, import `@/`, Bahasa Indonesia, shadcn/ui, lucide-react, sonner toast.
- Pakai `useFetch` + `api.post/put` sesuai konvensi.
- Hit lint rule `react-hooks/set-state-in-effect`: diperbaiki dengan memindahkan setState ke callback setTimeout (untuk debounce search) dan mengganti "reset state when X changes" effect dengan handler eksplisit di onSelect.

Stage Summary:
- `bun run lint` → 0 error di 3 file ini (1 warning pre-existing di use-fetch.ts, bukan milik task ini).
- `tsc --noEmit` → tidak ada error typecheck di 3 file ini.
- Work record: `/home/z/my-project/agent-ctx/7-circulation-loans-reservations-views.md`.
- Konvensi: navigasi pakai `setView("member-detail", { id })` dan `setView("book-detail", { id })` (kunci `id` sesuai page.tsx). View siap dipakai begitu sibling view (dashboard, catalog, dll) tersedia.

---
Task ID: 8
Agent: Dashboard & Reports Views Developer (Z.ai Code)
Tanggal: 2025-08

Work Log:
- Membaca worklog.md & semua shared components (StatCard, PageHeader, EmptyState, Spinner, BookCover), store, useFetch, api-client, constants, API routes `/api/stats` & `/api/loans`.
- FILE 1: `src/components/app/views/dashboard-view.tsx` (`DashboardView`) — landing page librarian. Welcome banner gradient (biru tua → hijau → biru) dengan tanggal Indonesia + tagline + 3 quick action (Tambah Buku → `setView("book-form")`, Sirkulasi → `setView("circulation")`, Tambah Anggota → `setView("members")`) + 4 HighlightChip mini. 8 StatCards (Total Buku, Eksemplar Tersedia emerald, Peminjaman Aktif sky, Terlambat red, Total Anggota, Siswa Aktif, Guru Aktif, Denda Tertunggak red `formatRupiah(overdueFineTotal)`). Charts: AreaChart "Tren Peminjaman 7 Hari" gradient fill + custom TrendTooltip; PieChart donut "Peminjaman per Kategori" innerRadius=45 + Legend `nama (count · pct%)` + custom CategoryTooltip. Two lists `max-h-96 scrollbar-thin`: Buku Terpopuler (rank + BookCover sm + loanCount badge, klik → `setView("book-detail",{id})`) & Anggota Paling Aktif (rank + avatar initials + ROLE_COLORS badge + loanCount badge, klik → `setView("member-detail",{id})`). Tabel Peminjaman Terbaru 5 baris (member/book clickable). Overdue alerts card merah (jika `overdueList` tidak kosong) dengan list max-h-96: CalendarClock icon + book + member + "{days} hari" badge + denda `formatRupiah`, tombol "Lihat Semua" → `setView("loans")`. Palette `CHART_COLORS=["#3b5b8c","#4a7c59","#c99544","#5a8fa6","#8b5a9e"]`. Responsive: charts stack on mobile.
- FILE 2: `src/components/app/views/reports-view.tsx` (`ReportsView`) — laporan & statistik dengan CSV export + print. PageHeader dengan actions "Cetak PDF" (`window.print()`) + "Export Excel (CSV)" (keduanya `className="no-print"`). Period selector `Select` (Harian 7d / Bulanan 30d / Tahunan 365d) filter `displayLoans` client-side. `print-area` wrapper + print-only header. 4 Summary cards (Total Peminjaman, Total Denda red, Buku Terpopuler amber, Anggota Paling Aktif sky). 3 Charts: BarChart "Peminjaman per Bulan" (group by year-month, 12 bulan terakhir); PieChart "Distribusi Status" (LOANED/RETURNED/OVERDUE, `STATUS_COLORS`); horizontal BarChart "Top 5 Buku Terpopuler" (`layout="vertical"`, Cell warna per bar). 2 Tables (printable, sticky header, `max-h-96 overflow-y-auto scrollbar-thin`): "Detail Peminjaman" (Tanggal/Anggota/Buku/Status/Denda) + "Ringkasan per Kategori" (No/Kategori/Total/Persentase + mini progress bar). CSV export: 12 kolom header, `csvEscape` handle koma/quote/newline, BOM `\uFEFF` untuk Excel UTF-8, filename `laporan-peminjaman-YYYY-MM-DD.csv`, Blob + anchor download. Toast success/error.
- Lint: `bun run lint` → **0 error, 0 warning** di kedua file ini (1 warning pre-existing di `use-fetch.ts`, bukan milik task ini).
- TypeScript: `tsc --noEmit` → **0 error** di kedua file ini.
- Work record: `/home/z/my-project/agent-ctx/8-dashboard-reports-views.md`.

Stage Summary:
- 2 view komponen siap pakai, mengikuti konvensi worklog (`useFetch` + `useAppStore` + shared components + shadcn/ui + lucide-react + sonner toast + recharts).
- Semua label & pesan dalam Bahasa Indonesia.
- Responsif mobile-first, card padding p-4/p-6, list panjang `max-h-96 overflow-y-auto scrollbar-thin`.
- Navigasi: `setView("book-form" | "circulation" | "members" | "book-detail" | "member-detail" | "catalog" | "loans")`.
- Tidak membuat route/API baru — hanya 2 file view sesuai instruksi.
- Dashboard sudah ter-render di `page.tsx` baris 62 & 98; Reports di baris 84.

---
Task ID: 9
Agent: Settings/Proposals/Announcements Views Agent (Z.ai Code)

Work Log:
- Membaca worklog.md (KONVENSI PENULISAN VIEW), constants.ts, use-fetch.ts, api-client.ts, use-app-store.ts, shared components (PageHeader, EmptyState, StatCard, Spinner), dan API routes (proposals, announcements, settings, categories, locations) + schema.prisma untuk memastikan kontrak API & tipe data sesuai.
- FILE 1: `src/components/app/views/proposals-view.tsx` (`ProposalsView`) — Usulan buku pengadaan koleksi.
  - Role-aware: LIBRARIAN fetch `/api/proposals` (semua), TEACHER/STUDENT fetch `/api/proposals?mine=1` (hanya milik sendiri).
  - PageHeader (icon Lightbulb) "Usulan Buku" + deskripsi. Tombol "Ajukan Buku" hanya untuk non-librarian → Dialog form (title*, author, publisher, isbn, reason Textarea) → POST /api/proposals, toast + refetch.
  - 3 StatCards: Total Usulan, Menunggu Persetujuan, Disetujui (dihitung client-side via useMemo).
  - Tabs filter: Semua | Menunggu | Disetujui | Ditolak (URL query `status` di-sync via useMemo).
  - List grid 2 kolom (`max-h-[700px] overflow-y-auto scrollbar-thin`). Card per usulan: judul bold + icon BookOpen, author/publisher/isbn inline, reason dalam box muted, proposer (nama + memberNumber mono + badge kategori ROLE_COLORS), status badge PROPOSAL_STATUS_LABELS/COLORS, tanggal diajukan formatDate.
  - LIBRARIAN actions per pending: "Setujui" (emerald-600) → PUT {id, status:"APPROVED"}; "Tolak" (red outline) → Dialog terpisah untuk reviewNote Textarea → PUT {id, status:"REJECTED", reviewNote}. Reviewed: tampilkan reviewer.name + reviewNote + reviewedAt dalam box tinted emerald/red.
  - Loading skeleton, empty state (dengan CTA "Ajukan Buku" untuk member), error state dengan retry.
- FILE 2: `src/components/app/views/announcements-view.tsx` (`AnnouncementsView`) — Feed pengumuman perpustakaan.
  - PageHeader (icon Megaphone) "Pengumuman" + deskripsi. Tombol "Buat Pengumuman" hanya LIBRARIAN → Dialog form (title*, content Textarea, isPinned Switch) → POST /api/announcements.
  - Layout single-column `max-w-3xl mx-auto` untuk readability. Feed `max-h-[750px] overflow-y-auto scrollbar-thin`.
  - Card per pengumuman: `border-l-4` accent; pinned → `border-l-primary border-primary/40 bg-primary/5` + badge "Disematkan" (icon Pin). Icon Megaphone dalam rounded box (primary tint jika pinned, muted jika tidak). Judul font-bold text-lg, content `whitespace-pre-line`, footer: author (icon User) + formatDate (icon Clock) + relative time sederhana ("Baru saja" / "X menit/jam/hari lalu" — helper `relativeTime` di dalam file).
  - LIBRARIAN actions per card: "Edit" (Dialog prefilled, PUT) / "Sematkan/Lepas" (toggle PUT, icon Pin/PinOff + Loader2) / "Hapus" (AlertDialog konfirmasi → DELETE /api/announcements?id=xxx).
  - Loading skeleton 3 card, empty state dengan CTA "Buat Pengumuman" untuk librarian, error state dengan retry.
- FILE 3: `src/components/app/views/settings-view.tsx` (`SettingsView`) — Pengaturan LIBRARIAN-only.
  - Guard: `user.role !== "LIBRARIAN"` → Card EmptyState "Akses Ditolak" (icon ShieldAlert).
  - PageHeader (icon Settings) "Pengaturan" + deskripsi.
  - Fetch `/api/settings` (Record<string,string>), `/api/categories`, `/api/locations`. Sync settings → form state sekali pakai flag `identityReady`/`rulesReady` (render-time setState pattern bawaan React, hindari `react-hooks/set-state-in-effect`).
  - Section 1 (Card, icon Library): Identitas Perpustakaan — Input library_name, head_librarian, library_address (Textarea, md:col-span-2). Tombol "Simpan Identitas" → PUT /api/settings dengan 3 key tersebut + toast + refetch.
  - Section 2 (Card, icon Ruler): Aturan Peminjaman — Table read-only LOAN_RULES per kategori (STUDENT/TEACHER/LIBRARIAN) dengan kolom maxBooks/loanDays/finePerDay(formatRupiah, "Gratis" bila 0)/maxRenewals + badge ROLE_COLORS. Separator. Catatan: "Aturan denda aktual mengikuti tabel di atas (default)." 4 Input number override: fine_per_day_student, fine_per_day_teacher, loan_days_student, loan_days_teacher → tombol "Simpan Aturan" PUT settings.
  - Section 3 (Card, icon Tag): Manajemen Kategori — tombol "Tambah Kategori" → Dialog (name*, code* mono, description Textarea) → POST /api/categories. Grid 1/2/3 kolom `max-h-96 overflow-y-auto scrollbar-thin` card kecil per kategori (name, code mono + Hash icon, description line-clamp-2, icon BookMarked).
  - Section 4 (Card, icon MapPin): Manajemen Rak/Lokasi — tombol "Tambah Rak" → Dialog (name*, code* mono, description) → POST /api/locations. Grid sama dengan section 3, icon MapPin.
  - Loading skeleton 3 card saat loadingSettings.
- Semua 3 file: `"use client"` di baris pertama, import `@/`, Bahasa Indonesia, shadcn/ui (Button/Input/Label/Textarea/Card/Badge/Table/Tabs/Dialog/AlertDialog/Switch/Separator), lucide-react, sonner toast. Card `p-4`/`p-6`, list panjang `max-h-96/max-h-[700px]/max-h-[750px] overflow-y-auto scrollbar-thin`. Responsif mobile-first (grid breakpoint sm/md/lg).

Stage Summary:
- `bun run lint` → 0 error di 3 file ini (hanya 1 warning pre-existing di use-fetch.ts yang bukan milik task ini).
- 3 view siap pakai, mengikuti seluruh konvensi worklog (useFetch + api + useAppStore + shared components + shadcn/ui + sonner toast). Tidak membuat route/API baru. Tidak menulis test.
- Integrasi: proposals-view menggantikan TODO di page.tsx untuk ViewKey "proposals"; announcements-view untuk "announcements"; settings-view untuk "settings". Semuanya merender via store router tanpa perubahan page.tsx.
- Work record: `/home/z/my-project/agent-ctx/9-proposals-announcements-settings-views.md`.

---
Task ID: 10
Agent: Member Self-Service Views Developer (Z.ai Code)
Work Log:
- Membaca worklog & semua shared components (BookCard, BookCover, PageHeader, EmptyState, StatCard, LoadingGrid, Spinner), store, useFetch, api-client, constants, API routes (loans, loans/[id]/renew, announcements, wishlist, notifications, books).
- FILE 1: `src/components/app/views/my-dashboard-view.tsx` (`MyDashboardView`) — Beranda personal TEACHER/STUDENT. Welcome banner gradient (primary) dengan greeting by time-of-day ("Selamat pagi/siang/sore/malam, {firstName}!"), memberNumber mono, ROLE_COLORS badge, tagline LIBRARY_TAGLINE, kuota peminjaman `LOAN_RULES[cat].maxBooks` ("X / Y buku") + Progress bar. 4 StatCards (Sedang Dipinjam BookOpen, Jatuh Tempo Minggu Ini Clock, Denda Wallet red-if->0 formatRupiah, Wishlist BookHeart). Layout dua kolom: kiri (lg:col-span-2) "Buku Sedang Dipinjam" — list Card mini BookCover + title + author + countdown Badge "Jatuh tempo dalam X hari" / "Terlambat X hari" red + fine + tombol Perpanjang (PUT /api/loans/{id}/renew dengan toast + refetch, disabled jika renewedCount >= maxRenewals); kanan "Pengumuman Terbaru" top 3 (pinned first, snippet, date) + "Lihat Semua" → setView("announcements") + mini-card "Kartu Anggota Saya" → setView("my-card"). Recommended books "Mungkin Kamu Suka" horizontal scroll row BookCards dari /api/books?limit=5. Empty states, loading skeletons, responsive stack-on-mobile.
- FILE 2: `src/components/app/views/my-loans-view.tsx` (`MyLoansView`) — Riwayat peminjaman personal. PageHeader + 3 StatCards (Sedang Dipinjam / Terlambat / Total Riwayat). Tabs filter Aktif | Terlambat | Riwayat. List Card (NOT table) per loan: mini BookCover + title + author + grid tanggal (Pinjam/Jatuh Tempo/Dikembalikan) + countdown badge + status badge LOAN_STATUS_LABELS/COLORS + fine box (formatRupiah, calculateFine) + renewedCount chip. Aksi: "Perpanjang" (PUT /api/loans/{id}/renew, disabled jika renew limit) + "Lihat Buku" → setView("book-detail",{id}). Overdue red accent + note "Kembalikan segera untuk menghentikan akumulasi denda". Returned shows returnDate + finePaid status. Empty states per tab. Help note bottom "Butuh bantuan? Kunjungi perpustakaan...". Loading skeleton.
- FILE 3: `src/components/app/views/wishlist-view.tsx` (`WishlistView`) — Wishlist favorit. PageHeader + 3 StatCards (Total Wishlist / Mau Baca / Aksi Cepat). Grid BookCards responsif (2/3/4/5 cols). Tombol Hapus overlay-on-hover (Trash2 icon) di desktop + always-visible button di mobile → DELETE /api/wishlist?bookId=xxx + toast + refetch. Empty state "Wishlist masih kosong" + "Jelajahi Katalog" → setView("catalog"). Loading pakai `<LoadingGrid>`. Helper card tips. Menggunakan `BookWithDetails` type dari shared book-card.
- FILE 4: `src/components/app/views/notifications-view.tsx` (`NotificationsView`) — In-app notifications. PageHeader + action "Tandai Semua Dibaca" (POST /api/notifications?action=read {all:true}) jika ada unread. 3 StatCards (Total / Belum Dibaca / Status). Tabs filter Semua | Belum Dibaca dengan badge count. List Card per notif: icon per type (INFO=Info sky, WARNING=AlertTriangle amber, OVERDUE=AlertCircle red, DUE_DATE=Clock orange, ANNOUNCEMENT=Megaphone primary) + title bold + message + relative time ("Baru saja"/"X menit/jam/hari lalu"/formatDate) + dot unread indicator + bg highlight + Badge type label. Click → POST /api/notifications?action=read {id}. List `max-h-[700px] overflow-y-auto scrollbar-thin`. Empty state "Tidak ada notifikasi". Loading skeleton. Helper card "Tentang Notifikasi".
- Konvensi: `"use client"` di atas, `@/` alias, `useFetch` + `api` + `useAppStore`, shared components (PageHeader/EmptyState/StatCard/BookCover/BookCard/LoadingGrid/Spinner), shadcn/ui (Button/Card/Badge/Tabs/Progress), sonner toast, semua label & pesan dalam Bahasa Indonesia sederhana, responsive mobile-first, `p-4`/`p-6` card padding, list panjang `max-h-* overflow-y-auto scrollbar-thin`.
- Lint: 4 file ini lolos tanpa error/warning (satu-satunya lint warning pre-existing di `src/hooks/use-fetch.ts` — bukan file tugas ini).
- TypeScript: `bunx tsc --noEmit` tidak ada error untuk keempat file.
- Work record: `/home/z/my-project/agent-ctx/10-member-self-service-views.md`.

Stage Summary:
- 4 view komponen (MyDashboardView, MyLoansView, WishlistView, NotificationsView) siap pakai, ter-integrasi dengan store (`setView("catalog"|"book-detail"|"announcements"|"my-card"|"my-loans"`), API routes (`/api/loans?mine=1`, `/api/loans/{id}/renew`, `/api/announcements`, `/api/wishlist?mine=1`, `/api/wishlist?bookId=`, `/api/notifications`, `/api/notifications?action=read`, `/api/books?limit=5`), dan konstanta (`LOAN_RULES`, `ROLE_LABELS`, `ROLE_COLORS`, `LOAN_STATUS_*`, `formatRupiah`, `formatDate`, `formatDateShort`, `daysBetween`, `calculateFine`, `LIBRARY_NAME`, `LIBRARY_TAGLINE`).
- Member (teacher/student) kini punya beranda personal dengan greeting + quota, list peminjaman aktif dengan countdown & perpanjangan self-service, pengumuman terbaru, recommended books, riwayat lengkap peminjaman dengan filter, wishlist favorit, dan pusat notifikasi dengan mark-as-read.
- Tidak membuat route/API baru — hanya 4 file view sesuai instruksi.

---
Task ID: FINAL
Agent: Main (Z.ai Code)
Task: Integrasi, verifikasi end-to-end, perbaikan akhir

Work Log:
- Semua 18 view dibuat oleh 6 subagent paralel (Task 5-10), masing-masing lolos lint
- page.tsx: auth gate (fetch /api/auth/me) + view router berbasis Zustand store
- Perbaikan use-fetch hook: semua setState dipindah ke async callback agar lolos aturan react-hooks/set-state-in-effect
- next.config.ts: tambah allowedDevOrigins (127.0.0.1, localhost, 21.0.2.100)
- Layout.tsx: Sonner Toaster + metadata Bahasa Indonesia
- Verifikasi Agent Browser:
  * Login pustakawan sukses → Dashboard "Selamat datang, Dewi Lestari" + 8 StatCard + 2 chart (trend & kategori) render
  * Navigasi: Catalog (15 buku), Members, Circulation, Reports — semua h1 benar, 0 error konsol
  * Login siswa (andini) sukses → "Beranda" + member number SIS-2024 ditemukan
  * Member card: QR code (SVG) + MemberCardPrint render
- Verifikasi API (curl): /api/auth/me, /login, /stats, /books, /members, /loans, /announcements semua 200
- Lint: 0 error, 0 warning
- Dev server berjalan di port 3000 (HTTP 200)

Stage Summary:
- Aplikasi lengkap & berfungsi end-to-end untuk 3 role (Pustakawan/Guru/Siswa)
- 15 buku seed + 7 anggota + transaksi peminjaman/reservasi/usulan/pengumuman/notifikasi
- Fitur: OPAC, manajemen bibliografi, keanggotaan, kartu anggota (QR+print), sirkulasi (pinjam/kembali/perpanjang), reservasi, wishlist, usulan, pengumuman, laporan (chart+CSV export+print), statistik dashboard, notifikasi, pengaturan
- Akun demo: pustakawan@/budi@/andini@jendelailmu.sch.id (password: password123)
