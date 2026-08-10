# Task ID: 8 — Dashboard & Reports Views

**Agent:** Z.ai Code (view-builder — dashboard/reports)
**Tanggal:** 2025-08

## Work Log

Membaca worklog.md & semua shared components, store, useFetch, api-client, constants, dan API routes (`/api/stats`, `/api/loans`). Membuat 2 file view librarian.

### FILE 1: `src/components/app/views/dashboard-view.tsx` — `DashboardView`
Landing page librarian setelah login. Rich dashboard:
- **Welcome banner**: gradient card (primary → hijau → biru) dengan decorative grid pattern + glow. Greeting "Selamat datang, {nama} 👋" + tanggal panjang Indonesia + tagline `LIBRARY_TAGLINE`. 3 quick action buttons: "Tambah Buku" → `setView("book-form")`, "Sirkulasi" → `setView("circulation")`, "Tambah Anggota" → `setView("members")`. 4 mini HighlightChip (Buku, Eksemplar, Anggota, Peminjaman Aktif).
- **Stats grid 2 baris × 4 kolom**: (1) Total Buku (BookOpen), Eksemplar Tersedia (PackageCheck, emerald), Peminjaman Aktif (ClipboardList, sky), Terlambat (AlertTriangle, red, overdueLoans); (2) Total Anggota (Users), Siswa Aktif (GraduationCap), Guru Aktif (BookMarked), Denda Tertunggak (Wallet, `formatRupiah(overdueFineTotal)`, red).
- **Charts section (lg:col-span-2 + 1)**: kiri AreaChart "Tren Peminjaman 7 Hari" pakai gradient fill (`trendFill`), tooltip Indonesia custom `TrendTooltip`; kanan PieChart donut "Peminjaman per Kategori" dengan `innerRadius=45`, Legend horizontal menampilkan `nama (count · pct%)`, custom `CategoryTooltip`.
- **Two lists side by side**: "Buku Terpopuler" (rank + BookCover sm + title + author + badge `loanCount× pinjam`, klik → `setView("book-detail",{id})`) dan "Anggota Paling Aktif" (rank + avatar initials + name + memberNumber + classGrade + ROLE_COLORS badge + `loanCount×` badge, klik → `setView("member-detail",{id})`). Keduanya `max-h-96 overflow-y-auto scrollbar-thin divide-y`.
- **Recent activity**: tabel "Peminjaman Terbaru" 5 baris (Anggota, Buku, Tanggal hidden mobile, Status badge). Member & book clickable. Tombol "Lihat Semua" → `setView("loans")`.
- **Overdue alerts** (jika `overdueList` tidak kosong): card merah (border-red-200 bg-red-50/50) dengan ikon AlertTriangle, list `max-h-96 scrollbar-thin` menampilkan icon CalendarClock + book title + member name + jatuh tempo + badge "{days} hari" + denda `formatRupiah`. Tombol "Lihat Semua" → `setView("loans")`.
- Loading: gradient pulse + Spinner. Error: EmptyState friendly.
- Chart palette: `CHART_COLORS = ["#3b5b8c","#4a7c59","#c99544","#5a8fa6","#8b5a9e"]`, `PIE_COLORS` extended 7 warna.
- Responsive: charts stack on mobile (`grid-cols-1 lg:grid-cols-3`), tabel horizontal scroll, highlight chips `grid-cols-2 sm:grid-cols-4`.

### FILE 2: `src/components/app/views/reports-view.tsx` — `ReportsView`
Laporan & statistik dengan export CSV (Excel-compatible) + print:
- **PageHeader**: title "Laporan & Statistik", description "Analisis aktivitas perpustakaan", icon BarChart3. Actions: tombol "Cetak PDF" (`window.print()`) + tombol "Export Excel (CSV)" (generate CSV blob). Keduanya `className="no-print"`.
- **Period selector** (`Select`): Harian (7 hari) / Bulanan (30 hari) / Tahunan (365 hari). Filter `displayLoans` client-side. Card pembungkus `no-print`.
- **Print area**: `<div className="print-area space-y-6">` membungkus semua konten cetak. Header tambahan `hidden print:block` menampilkan judul + periode + tanggal cetak.
- **Summary cards 4**: Total Peminjaman (ClipboardList), Total Denda (Wallet, red, `formatRupiah`), Buku Terpopuler (Trophy, amber), Anggota Paling Aktif (UserCheck, sky).
- **Charts**:
  - Bar chart "Peminjaman per Bulan" — `monthlyData` dihitung dari `/api/loans` (group by year-month, 12 bulan terakhir), label `mm/yy` Indonesia, custom `MonthTooltip`.
  - Pie chart "Distribusi Status Peminjaman" — `statusData` (LOANED/RETURNED/OVERDUE), warna `STATUS_COLORS` (biru/hijau/merah-bata), label inline `nama (count)`.
  - Horizontal bar chart "Top 5 Buku Terpopuler" — `layout="vertical"`, YAxis category = judul (truncate 30 char), XAxis number, warna Cell per bar dari `CHART_COLORS`, custom `BookTooltip`.
- **Data tables (printable)**:
  - "Detail Peminjaman": Table dengan sticky header, `max-h-96 overflow-y-auto scrollbar-thin border-t`. Kolom: Tanggal, Anggota (fullName + memberNumber + kategori), Buku (title + author), Status badge, Denda (formatRupiah, red jika > 0). Tampilkan `displayLoans.length` transaksi sesuai periode.
  - "Ringkasan per Kategori": Table dengan No, Kategori, Total Peminjaman, Persentase (mini progress bar warna + `pct%`).
- **CSV export**: header 12 kolom (Tanggal Pinjam/Jatuh Tempo/Kembali, Nomor/Nama Anggota, Kategori, Kelas, Judul, Pengarang, Status, Denda, Denda Dibayar). Fungsi `csvEscape` handle koma/quote/newline. Tambah BOM `\uFEFF` untuk Excel UTF-8. Filename `laporan-peminjaman-YYYY-MM-DD.csv`. Buat Blob, anchor download, revoke URL. Toast success/error.
- Loading: Spinner. Error: EmptyState. Empty state per section (charts & tables).
- Responsive: charts `grid-cols-1 lg:grid-cols-2`, tombol export label collapse on mobile (`hidden sm:inline`), horizontal scroll di tabel.

## Lint & Type Check
- `bun run lint` → **0 error, 0 warning** di kedua file ini (1 warning pre-existing di `use-fetch.ts`, bukan milik task ini).
- `npx tsc --noEmit` → **0 error** di kedua file ini.

## Konvensi yang Diikuti
- `"use client"` di baris pertama kedua file.
- Import `@/` alias, shared components (StatCard, PageHeader, EmptyState, Spinner, BookCover), shadcn/ui (Button, Card, Badge, Table, Select), lucide-react, sonner toast.
- `useFetch` dari `@/hooks/use-fetch`, `useAppStore` untuk navigasi.
- Bahasa Indonesia untuk semua label & pesan.
- Card padding `p-4 sm:p-6`, list panjang `max-h-96 overflow-y-auto scrollbar-thin`.
- recharts (v3) untuk semua chart, palette warna sesuai spec (`#3b5b8c`, `#4a7c59`, `#c99544`, `#5a8fa6`, `#8b5a9e`).
- Tidak membuat route/API baru — hanya 2 file view sesuai instruksi.

## Stage Summary
Dashboard librarian & halaman laporan siap pakai. Dashboard menampilkan welcome banner, 8 stat cards, 2 chart (area + donut), 2 list (popular books + top members), tabel peminjaman terbaru, dan alert keterlambatan. Reports menyediakan 4 summary cards, 3 chart (bar bulanan, pie status, horizontal bar top 5), 2 tabel detail (loans + kategori), dengan export CSV Excel-compatible (BOM + escape) dan print PDF via `window.print()` pada `print-area`. Kedua file lolos lint & typecheck, mengikuti konvensi worklog sepenuhnya.
