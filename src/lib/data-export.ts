/**
 * Data Export — Convert Prisma data to CSV / JSON.
 *
 * Sprint L - Power User Integration & Data Export.
 *
 * Provides:
 * - exportBooks: list of all books with details
 * - exportMembers: list of members (anonymized option for GDPR)
 * - exportLoans: list of loans (with filters)
 * - exportFines: fine records
 * - exportReservations: reservation queue
 * - exportInventory: stock opname inventory
 *
 * Each function:
 * - Returns rows + filename
 * - Supports date range filters
 * - Supports status filters
 * - Formats dates for Excel
 * - Handles nullable fields gracefully
 *
 * Privacy:
 * - Members can be anonymized (replaces name/email with hash)
 * - Passwords NEVER exported
 * - API keys NEVER exported
 */

import { db } from "@/lib/db";
import { generateCSV } from "@/lib/csv";
import { logger } from "@/lib/logger";

// ===== Types =====

export interface ExportResult {
  filename: string;
  content: string;
  rowCount: number;
  mimeType: string;
  generatedAt: Date;
}

export interface DateRange {
  from?: Date;
  to?: Date;
}

export interface AnonymizeOptions {
  /** Replace names with "Member #123" */
  anonymizeNames: boolean;
  /** Replace emails with hash */
  anonymizeEmails: boolean;
  /** Replace phone with empty */
  anonymizePhones: boolean;
}

// ===== Helpers =====

/**
 * Format date for Excel/cell display.
 */
function fmtDate(d: Date | null | undefined): string {
  if (!d) return "";
  // YYYY-MM-DD HH:mm:ss
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * Simple hash for anonymization (not crypto-secure, just for ID redaction).
 */
function hash(s: string): string {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36).slice(0, 8);
}

/**
 * Apply date range filter to a where clause.
 */
function applyDateRange(
  range: DateRange | undefined,
  field: string = "createdAt"
): Record<string, any> {
  if (!range) return {};
  const filter: Record<string, any> = {};
  if (range.from) filter.gte = range.from;
  if (range.to) filter.lte = range.to;
  return { [field]: filter };
}

// ===== Books Export =====

export interface BookExportRow {
  id: string;
  judul: string;
  pengarang: string;
  penerbit: string;
  isbn: string;
  tahun: number | null;
  kategori: string;
  rak: string;
  totalEksemplar: number;
  tersedia: number;
  dipinjam: number;
  rusak: number;
  status: string;
}

/**
 * Export all books with inventory stats.
 */
export async function exportBooks(
  range?: DateRange,
  categoryId?: string
): Promise<ExportResult> {
  const where: Record<string, any> = {};
  if (categoryId) where.categoryId = categoryId;
  Object.assign(where, applyDateRange(range, "createdAt"));

  const books = await db.book.findMany({
    where,
    include: {
      category: true,
      location: true,
      items: {
        select: { status: true },
      },
    },
    orderBy: { title: "asc" },
  });

  const rows: BookExportRow[] = books.map((b) => {
    const items = b.items;
    const total = items.length;
    const tersedia = items.filter((i) => i.status === "AVAILABLE").length;
    const dipinjam = items.filter((i) => i.status === "BORROWED").length;
    const rusak = items.filter(
      (i) => i.status === "DAMAGED" || i.status === "LOST"
    ).length;

    return {
      id: b.id,
      judul: b.title,
      pengarang: b.author,
      penerbit: b.publisher ?? "",
      isbn: b.isbn ?? "",
      tahun: b.year ?? null,
      kategori: b.category?.name ?? "",
      rak: b.location?.name ?? "",
      totalEksemplar: total,
      tersedia,
      dipinjam,
      rusak,
      status: "ACTIVE",
    };
  });

  const content = generateCSV(
    rows as unknown as Record<string, any>[],
    [
      "id",
      "judul",
      "pengarang",
      "penerbit",
      "isbn",
      "tahun",
      "kategori",
      "rak",
      "totalEksemplar",
      "tersedia",
      "dipinjam",
      "rusak",
      "status",
    ]
  );

  const filename = `buku-export-${new Date().toISOString().split("T")[0]}.csv`;
  logger.info("Books exported", { count: rows.length });

  return {
    filename,
    content,
    rowCount: rows.length,
    mimeType: "text/csv;charset=utf-8;",
    generatedAt: new Date(),
  };
}

// ===== Members Export =====

export interface MemberExportRow {
  id: string;
  nama: string;
  email: string;
  telepon: string;
  role: string;
  tipe: string;
  status: string;
  tglDaftar: string;
  totalPeminjaman: number;
  poin: number;
}

/**
 * Export members. Supports anonymization for privacy.
 */
export async function exportMembers(
  range?: DateRange,
  anonymize: Partial<AnonymizeOptions> = {}
): Promise<ExportResult> {
  const where: Record<string, any> = {};
  Object.assign(where, applyDateRange(range, "createdAt"));

  const members = await db.member.findMany({
    where,
    include: {
      user: { select: { email: true, role: true, createdAt: true } },
      _count: { select: { loans: true } },
    },
    orderBy: { fullName: "asc" },
  });

  const opts: AnonymizeOptions = {
    anonymizeNames: anonymize.anonymizeNames ?? false,
    anonymizeEmails: anonymize.anonymizeEmails ?? false,
    anonymizePhones: anonymize.anonymizePhones ?? false,
  };

  const rows: MemberExportRow[] = members.map((m, idx) => {
    const memberIdx = idx + 1;
    let nama = m.fullName;
    let email = m.user?.email ?? "";
    let telepon = m.phone ?? "";

    if (opts.anonymizeNames) nama = `Member #${memberIdx}`;
    if (opts.anonymizeEmails) email = `${hash(email || m.id)}@anon.local`;
    if (opts.anonymizePhones) telepon = "";

    return {
      id: m.id,
      nama,
      email,
      telepon,
      role: m.user?.role ?? "",
      tipe: m.category,
      status: m.status,
      tglDaftar: fmtDate(m.joinDate),
      totalPeminjaman: m._count.loans,
      poin: 0,
    };
  });

  const content = generateCSV(
    rows as unknown as Record<string, any>[],
    [
      "id",
      "nama",
      "email",
      "telepon",
      "role",
      "tipe",
      "status",
      "tglDaftar",
      "totalPeminjaman",
      "poin",
    ]
  );

  const filename = `anggota-export-${new Date().toISOString().split("T")[0]}.csv`;
  logger.info("Members exported", { count: rows.length, anonymized: opts.anonymizeNames });

  return {
    filename,
    content,
    rowCount: rows.length,
    mimeType: "text/csv;charset=utf-8;",
    generatedAt: new Date(),
  };
}

// ===== Loans Export =====

export interface LoanExportRow {
  id: string;
  anggota: string;
  buku: string;
  eksemplar: string;
  tglPinjam: string;
  jatuhTempo: string;
  tglKembali: string;
  status: string;
  denda: number;
  perpanjangan: number;
}

export type LoanStatusFilter =
  | "ALL"
  | "ACTIVE"
  | "RETURNED"
  | "OVERDUE"
  | "LOST";

/**
 * Export loan records.
 */
export async function exportLoans(
  range?: DateRange,
  status: LoanStatusFilter = "ALL"
): Promise<ExportResult> {
  const where: Record<string, any> = {};
  if (status !== "ALL") {
    if (status === "OVERDUE") {
      where.status = "LOANED";
      where.dueDate = { lt: new Date() };
    } else if (status === "ACTIVE") {
      where.status = "LOANED";
    } else if (status === "RETURNED") {
      where.status = "RETURNED";
    } else if (status === "LOST") {
      where.status = "LOST";
    }
  }
  Object.assign(where, applyDateRange(range, "loanDate"));

  const loans = await db.loan.findMany({
    where,
    include: {
      member: { select: { fullName: true } },
      bookItem: {
        include: { book: { select: { title: true } } },
      },
    },
    orderBy: { loanDate: "desc" },
    take: 10000, // Safety cap
  });

  const rows: LoanExportRow[] = loans.map((l) => ({
    id: l.id,
    anggota: l.member?.fullName ?? "Unknown",
    buku: l.bookItem?.book?.title ?? "Unknown",
    eksemplar: l.bookItem?.itemCode ?? "",
    tglPinjam: fmtDate(l.loanDate),
    jatuhTempo: fmtDate(l.dueDate),
    tglKembali: fmtDate(l.returnDate),
    status: l.status,
    denda: l.fineAmount ?? 0,
    perpanjangan: l.renewedCount ?? 0,
  }));

  const content = generateCSV(
    rows as unknown as Record<string, any>[],
    [
      "id",
      "anggota",
      "buku",
      "eksemplar",
      "tglPinjam",
      "jatuhTempo",
      "tglKembali",
      "status",
      "denda",
      "perpanjangan",
    ]
  );

  const filename = `peminjaman-export-${new Date().toISOString().split("T")[0]}.csv`;
  logger.info("Loans exported", { count: rows.length, status });

  return {
    filename,
    content,
    rowCount: rows.length,
    mimeType: "text/csv;charset=utf-8;",
    generatedAt: new Date(),
  };
}

// ===== Fines Export =====

export interface FineExportRow {
  id: string;
  anggota: string;
  buku: string;
  jumlah: number;
  dibayar: number;
  sisa: number;
  status: string;
  tgl: string;
  alasan: string;
}

/**
 * Export fine records.
 */
export async function exportFines(
  range?: DateRange,
  onlyUnpaid: boolean = false
): Promise<ExportResult> {
  const where: Record<string, any> = {};
  if (onlyUnpaid) {
    where.finePaid = 0;
    where.fineAmount = { gt: 0 };
  }
  Object.assign(where, applyDateRange(range, "createdAt"));

  const loans = await db.loan.findMany({
    where,
    include: {
      member: { select: { fullName: true } },
      bookItem: { include: { book: { select: { title: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows: FineExportRow[] = loans.map((f) => {
    const amount = f.fineAmount ?? 0;
    const paid = f.finePaid ?? 0;
    return {
      id: f.id,
      anggota: f.member?.fullName ?? "Unknown",
      buku: f.bookItem?.book?.title ?? "Unknown",
      jumlah: amount,
      dibayar: paid,
      sisa: Math.max(0, amount - paid),
      status: f.status,
      tgl: fmtDate(f.createdAt),
      alasan: f.notes ?? "",
    };
  });

  const content = generateCSV(
    rows as unknown as Record<string, any>[],
    ["id", "anggota", "buku", "jumlah", "dibayar", "sisa", "status", "tgl", "alasan"]
  );

  const filename = `denda-export-${new Date().toISOString().split("T")[0]}.csv`;
  logger.info("Fines exported", { count: rows.length, onlyUnpaid });

  return {
    filename,
    content,
    rowCount: rows.length,
    mimeType: "text/csv;charset=utf-8;",
    generatedAt: new Date(),
  };
}

// ===== Reservations Export =====

export interface ReservationExportRow {
  id: string;
  anggota: string;
  buku: string;
  tglReservasi: string;
  status: string;
  expiresAt: string;
  queuePosition: number;
}

/**
 * Export reservation queue.
 */
export async function exportReservations(
  range?: DateRange,
  activeOnly: boolean = false
): Promise<ExportResult> {
  const where: Record<string, any> = {};
  if (activeOnly) {
    where.status = { in: ["PENDING", "WAITING", "READY"] };
  }
  Object.assign(where, applyDateRange(range, "createdAt"));

  const reservations = await db.reservation.findMany({
    where,
    include: {
      member: { select: { fullName: true } },
      book: { select: { title: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows: ReservationExportRow[] = reservations.map((r, idx) => ({
    id: r.id,
    anggota: r.member?.fullName ?? "Unknown",
    buku: r.book?.title ?? "Unknown",
    tglReservasi: fmtDate(r.createdAt),
    status: r.status,
    expiresAt: fmtDate(r.expiresAt),
    queuePosition: idx + 1,
  }));

  const content = generateCSV(
    rows as unknown as Record<string, any>[],
    ["id", "anggota", "buku", "tglReservasi", "status", "expiresAt", "queuePosition"]
  );

  const filename = `reservasi-export-${new Date().toISOString().split("T")[0]}.csv`;
  logger.info("Reservations exported", { count: rows.length });

  return {
    filename,
    content,
    rowCount: rows.length,
    mimeType: "text/csv;charset=utf-8;",
    generatedAt: new Date(),
  };
}

// ===== Audit Log Export =====

export interface AuditExportRow {
  id: string;
  tanggal: string;
  user: string;
  aksi: string;
  resource: string;
  resourceId: string;
  detail: string;
  ip: string;
}

/**
 * Export audit log for compliance review.
 */
export async function exportAuditLog(
  range?: DateRange,
  userId?: string
): Promise<ExportResult> {
  const where: Record<string, any> = {};
  if (userId) where.userId = userId;
  Object.assign(where, applyDateRange(range, "createdAt"));

  const logs = await db.auditLog.findMany({
    where,
    include: { user: { select: { email: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50000, // Safety cap
  });

  const rows: AuditExportRow[] = logs.map((l) => ({
    id: l.id,
    tanggal: fmtDate(l.createdAt),
    user: l.user?.email ?? l.userId ?? "system",
    aksi: l.action,
    resource: l.entityType,
    resourceId: l.entityId ?? "",
    detail: l.detail ?? "",
    ip: "",
  }));

  const content = generateCSV(
    rows as unknown as Record<string, any>[],
    ["id", "tanggal", "user", "aksi", "resource", "resourceId", "detail", "ip"]
  );

  const filename = `audit-log-export-${new Date().toISOString().split("T")[0]}.csv`;
  logger.info("Audit log exported", { count: rows.length });

  return {
    filename,
    content,
    rowCount: rows.length,
    mimeType: "text/csv;charset=utf-8;",
    generatedAt: new Date(),
  };
}

// ===== Generic export entrypoint =====

export type ExportType =
  | "books"
  | "members"
  | "loans"
  | "fines"
  | "reservations"
  | "audit";

export interface ExportRequest {
  type: ExportType;
  from?: string;
  to?: string;
  anonymize?: boolean;
  status?: string;
}

/**
 * Unified export entrypoint.
 */
export async function exportData(req: ExportRequest): Promise<ExportResult> {
  const range: DateRange = {};
  if (req.from) range.from = new Date(req.from);
  if (req.to) range.to = new Date(req.to);

  switch (req.type) {
    case "books":
      return await exportBooks(range);
    case "members":
      return await exportMembers(range, {
        anonymizeNames: !!req.anonymize,
        anonymizeEmails: !!req.anonymize,
        anonymizePhones: !!req.anonymize,
      });
    case "loans":
      return await exportLoans(range, (req.status as LoanStatusFilter) || "ALL");
    case "fines":
      return await exportFines(range, req.status === "unpaid");
    case "reservations":
      return await exportReservations(range, req.status === "active");
    case "audit":
      return await exportAuditLog(range);
    default:
      throw new Error(`Unknown export type: ${req.type}`);
  }
}
