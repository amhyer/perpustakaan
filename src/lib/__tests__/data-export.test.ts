/**
 * Tests for data export library.
 *
 * Sprint L - Power User Integration & Data Export.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock db
vi.mock("../db", () => ({
  db: {
    book: {
      findMany: vi.fn(),
    },
    member: {
      findMany: vi.fn(),
    },
    loan: {
      findMany: vi.fn(),
    },
    reservation: {
      findMany: vi.fn(),
    },
    auditLog: {
      findMany: vi.fn(),
    },
  },
}));

// Mock logger to avoid side effects
vi.mock("../logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { db } from "../db";
import {
  exportBooks,
  exportMembers,
  exportLoans,
  exportFines,
  exportReservations,
  exportAuditLog,
  exportData,
  type LoanStatusFilter,
  type AnonymizeOptions,
} from "../data-export";
import { generateCSV } from "../csv";

describe("data-export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===== Books =====
  describe("exportBooks", () => {
    it("returns filename, content, row count", async () => {
      vi.mocked(db.book.findMany).mockResolvedValue([
        {
          id: "b1",
          title: "Laskar Pelangi",
          isbn: "978-1",
          year: 2005,
          author: "Andrea Hirata",
          publisher: "Bentang",
          status: "ACTIVE",
          category: { name: "Fiksi" },
          location: { name: "Rak A1" },
          items: [
            { status: "AVAILABLE" },
            { status: "AVAILABLE" },
            { status: "BORROWED" },
          ],
        },
      ] as any);

      const result = await exportBooks();
      expect(result.rowCount).toBe(1);
      expect(result.filename).toMatch(/^buku-export-\d{4}-\d{2}-\d{2}\.csv$/);
      expect(result.mimeType).toBe("text/csv;charset=utf-8;");
      expect(result.content).toContain("Laskar Pelangi");
      expect(result.content).toContain("Andrea Hirata");
    });

    it("handles book with no items", async () => {
      vi.mocked(db.book.findMany).mockResolvedValue([
        {
          id: "b2",
          title: "Empty Book",
          isbn: null,
          year: null,
          author: "",
          publisher: null,
          status: "ACTIVE",
          category: null,
          location: null,
          items: [],
        },
      ] as any);

      const result = await exportBooks();
      expect(result.content).toContain("Empty Book");
      // Empty fields are still columns
      expect(result.content.split("\n")[0]).toContain("id");
    });

    it("applies date range filter", async () => {
      vi.mocked(db.book.findMany).mockResolvedValue([]);
      const from = new Date("2024-01-01");
      const to = new Date("2024-12-31");
      await exportBooks({ from, to });
      expect(db.book.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gte: from, lte: to },
          }),
        })
      );
    });

    it("applies category filter", async () => {
      vi.mocked(db.book.findMany).mockResolvedValue([]);
      await exportBooks(undefined, "cat123");
      expect(db.book.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ categoryId: "cat123" }),
        })
      );
    });

    it("counts inventory correctly", async () => {
      vi.mocked(db.book.findMany).mockResolvedValue([
        {
          id: "b3",
          title: "Test",
          isbn: null,
          year: 2020,
          author: "",
          publisher: null,
          status: "ACTIVE",
          category: null,
          location: null,
          items: [
            { status: "AVAILABLE" },
            { status: "AVAILABLE" },
            { status: "BORROWED" },
            { status: "DAMAGED" },
            { status: "LOST" },
          ],
        },
      ] as any);

      const result = await exportBooks();
      const lines = result.content.split("\n");
      const row = lines[1];
      expect(row).toContain(",5,"); // total
      expect(row).toContain(",2,"); // tersedia
      expect(row).toContain(",1,"); // dipinjam
      expect(row).toContain(",2,"); // rusak (DAMAGED + LOST)
    });

    it("handles empty book list", async () => {
      vi.mocked(db.book.findMany).mockResolvedValue([]);
      const result = await exportBooks();
      expect(result.rowCount).toBe(0);
      // Headers only
      expect(result.content).toContain("judul");
    });
  });

  // ===== Members =====
  describe("exportMembers", () => {
    it("exports members with basic info", async () => {
      vi.mocked(db.member.findMany).mockResolvedValue([
        {
          id: "m1",
          fullName: "Budi Santoso",
          phone: "08123456789",
          category: "STUDENT",
          status: "ACTIVE",
          joinDate: new Date("2024-01-15"),
          user: { email: "budi@school.id", role: "STUDENT", createdAt: new Date("2024-01-15") },
          _count: { loans: 5 },
        },
      ] as any);

      const result = await exportMembers();
      expect(result.content).toContain("Budi Santoso");
      expect(result.content).toContain("budi@school.id");
      expect(result.content).toContain("STUDENT");
      expect(result.content).toContain("0");
    });

    it("anonymizes names when requested", async () => {
      vi.mocked(db.member.findMany).mockResolvedValue([
        {
          id: "m2",
          fullName: "Rahasia Penting",
          phone: "08111111111",
          category: "STUDENT",
          status: "ACTIVE",
          joinDate: new Date(),
          user: { email: "secret@x.com", role: "STUDENT", createdAt: new Date() },
          _count: { loans: 0 },
        },
      ] as any);

      const result = await exportMembers(undefined, { anonymizeNames: true, anonymizeEmails: true, anonymizePhones: true });
      expect(result.content).not.toContain("Rahasia Penting");
      expect(result.content).toContain("Member #1");
      expect(result.content).not.toContain("secret@x.com");
      expect(result.content).not.toContain("08111111111");
    });

    it("keeps original data when not anonymizing", async () => {
      vi.mocked(db.member.findMany).mockResolvedValue([
        {
          id: "m3",
          fullName: "Asli Original",
          phone: "08999",
          category: "TEACHER",
          status: "ACTIVE",
          joinDate: new Date(),
          user: { email: "a@b.com", role: "TEACHER", createdAt: new Date() },
          _count: { loans: 1 },
        },
      ] as any);

      const result = await exportMembers();
      expect(result.content).toContain("Asli Original");
      expect(result.content).toContain("a@b.com");
    });

    it("handles null gamification profile", async () => {
      vi.mocked(db.member.findMany).mockResolvedValue([
        {
          id: "m4",
          fullName: "No Points",
          phone: null,
          category: "STUDENT",
          status: "ACTIVE",
          joinDate: new Date(),
          user: { email: "np@x.com", role: "STUDENT", createdAt: new Date() },
          _count: { loans: 0 },
        },
      ] as any);

      const result = await exportMembers();
      expect(result.content).toContain("No Points");
      // Should not crash, points should be 0
      expect(result.content).toContain(",0,");
    });
  });

  // ===== Loans =====
  describe("exportLoans", () => {
    it("exports active loans", async () => {
      vi.mocked(db.loan.findMany).mockResolvedValue([
        {
          id: "l1",
          loanDate: new Date("2024-06-01"),
          dueDate: new Date("2024-06-15"),
          returnDate: null,
          status: "ACTIVE",
          fineAmount: 0,
          renewedCount: 0,
          member: { fullName: "Budi" },
          bookItem: { itemCode: "BC001", book: { title: "Buku A" } },
        },
      ] as any);

      const result = await exportLoans(undefined, "ACTIVE");
      expect(result.content).toContain("Budi");
      expect(result.content).toContain("Buku A");
      expect(result.content).toContain("BC001");
      expect(result.content).toContain("ACTIVE");
    });

    it("filters by status OVERDUE", async () => {
      vi.mocked(db.loan.findMany).mockResolvedValue([]);
      const past = new Date("2024-01-01");
      await exportLoans({ from: past }, "OVERDUE");
      expect(db.loan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "LOANED",
            dueDate: expect.objectContaining({ lt: expect.any(Date) }),
          }),
        })
      );
    });

    it("handles loans without return date", async () => {
      vi.mocked(db.loan.findMany).mockResolvedValue([
        {
          id: "l2",
          loanDate: new Date(),
          dueDate: new Date(),
          returnDate: null,
          status: "ACTIVE",
          fineAmount: 0,
          renewedCount: 1,
          member: { fullName: "Test" },
          bookItem: { itemCode: "B1", book: { title: "T" } },
        },
      ] as any);

      const result = await exportLoans();
      // Return date should be empty
      const lines = result.content.split("\n");
      expect(lines[1].split(",").length).toBeGreaterThanOrEqual(9);
    });

    it("applies date range filter", async () => {
      vi.mocked(db.loan.findMany).mockResolvedValue([]);
      const from = new Date("2024-01-01");
      await exportLoans({ from });
      expect(db.loan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ loanDate: { gte: from } }),
        })
      );
    });

    it("ALL status doesn't filter", async () => {
      vi.mocked(db.loan.findMany).mockResolvedValue([]);
      await exportLoans(undefined, "ALL");
      const call = vi.mocked(db.loan.findMany).mock.calls[0][0] as any;
      expect(call.where.status).toBeUndefined();
    });
  });

  // ===== Fines =====
  describe("exportFines", () => {
    it("exports all fines", async () => {
      vi.mocked(db.loan.findMany).mockResolvedValue([
        {
          id: "f1",
          fineAmount: 5000,
          finePaid: 5000,
          status: "RETURNED",
          createdAt: new Date(),
          notes: "Telat 5 hari",
          member: { fullName: "Budi" },
          bookItem: { book: { title: "Buku" } },
        },
      ] as any);

      const result = await exportFines();
      expect(result.content).toContain("Budi");
      expect(result.content).toContain("Telat 5 hari");
      expect(result.content).toContain("5000");
    });

    it("onlyUnpaid filters by finePaid=0 and fineAmount>0", async () => {
      vi.mocked(db.loan.findMany).mockResolvedValue([]);
      await exportFines(undefined, true);
      expect(db.loan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            finePaid: 0,
            fineAmount: { gt: 0 },
          }),
        })
      );
    });

    it("calculates remaining amount", async () => {
      vi.mocked(db.loan.findMany).mockResolvedValue([
        {
          id: "f2",
          fineAmount: 10000,
          finePaid: 4000,
          status: "PARTIAL",
          createdAt: new Date(),
          notes: null,
          member: { fullName: "X" },
          bookItem: { book: { title: "Y" } },
        },
      ] as any);

      const result = await exportFines();
      // Should show 10000, 4000, 6000
      const lines = result.content.split("\n");
      expect(lines[1]).toContain("10000");
      expect(lines[1]).toContain("4000");
      expect(lines[1]).toContain("6000");
    });
  });

  // ===== Reservations =====
  describe("exportReservations", () => {
    it("exports reservations with queue position", async () => {
      vi.mocked(db.reservation.findMany).mockResolvedValue([
        {
          id: "r1",
          status: "PENDING",
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          member: { fullName: "Budi" },
          book: { title: "Buku Populer" },
        },
        {
          id: "r2",
          status: "PENDING",
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          member: { fullName: "Siti" },
          book: { title: "Buku Populer" },
        },
      ] as any);

      const result = await exportReservations();
      expect(result.content).toContain("Budi");
      expect(result.content).toContain("Siti");
      const lines = result.content.split("\n");
      // First data row has queue position 1 (last column)
      expect(lines[1].trim().endsWith(",1")).toBe(true);
      // Second has position 2
      expect(lines[2].trim().endsWith(",2")).toBe(true);
    });

    it("activeOnly filters to PENDING/WAITING/READY", async () => {
      vi.mocked(db.reservation.findMany).mockResolvedValue([]);
      await exportReservations(undefined, true);
      expect(db.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ["PENDING", "WAITING", "READY"] },
          }),
        })
      );
    });
  });

  // ===== Audit Log =====
  describe("exportAuditLog", () => {
    it("exports audit logs with formatted dates", async () => {
      vi.mocked(db.auditLog.findMany).mockResolvedValue([
        {
          id: "a1",
          action: "CREATE",
          entityType: "Book",
          entityId: "b1",
          detail: JSON.stringify({ title: "Buku A" }),
          ipAddress: "127.0.0.1",
          createdAt: new Date("2024-06-15T10:30:00"),
          userId: "u1",
          user: { email: "admin@x.com", name: "Admin" },
        },
      ] as any);

      const result = await exportAuditLog();
      expect(result.content).toContain("admin@x.com");
      expect(result.content).toContain("CREATE");
      expect(result.content).toContain("Book");
      expect(result.content).toContain("2024-06-15");
    });

    it("handles string detail field", async () => {
      vi.mocked(db.auditLog.findMany).mockResolvedValue([
        {
          id: "a2",
          action: "UPDATE",
          entityType: "Member",
          entityId: "m1",
          detail: "manual note",
          ipAddress: null,
          createdAt: new Date(),
          userId: null,
          user: null,
        },
      ] as any);

      const result = await exportAuditLog();
      expect(result.content).toContain("manual note");
      // No user → system
      expect(result.content).toContain("system");
    });

    it("applies userId filter", async () => {
      vi.mocked(db.auditLog.findMany).mockResolvedValue([]);
      await exportAuditLog(undefined, "u-123");
      expect(db.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: "u-123" }),
        })
      );
    });
  });

  // ===== Generic entrypoint =====
  describe("exportData", () => {
    it("dispatches to exportBooks", async () => {
      vi.mocked(db.book.findMany).mockResolvedValue([]);
      const result = await exportData({ type: "books" });
      expect(result.rowCount).toBe(0);
      expect(db.book.findMany).toHaveBeenCalled();
    });

    it("dispatches to exportMembers with anonymize", async () => {
      vi.mocked(db.member.findMany).mockResolvedValue([
        {
          id: "m1",
          fullName: "Secret Name",
          phone: "08000",
          category: "STUDENT",
          status: "ACTIVE",
          joinDate: new Date(),
          user: { email: "s@x.com", role: "STUDENT", createdAt: new Date() },
          _count: { loans: 0 },
        },
      ] as any);

      const result = await exportData({ type: "members", anonymize: true });
      expect(result.content).not.toContain("Secret Name");
      expect(result.content).toContain("Member #1");
    });

    it("dispatches to exportLoans with status", async () => {
      vi.mocked(db.loan.findMany).mockResolvedValue([]);
      await exportData({ type: "loans", status: "OVERDUE" });
      expect(db.loan.findMany).toHaveBeenCalled();
    });

    it("dispatches to exportFines with only-unpaid", async () => {
      vi.mocked(db.loan.findMany).mockResolvedValue([]);
      await exportData({ type: "fines", status: "unpaid" });
      expect(db.loan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ finePaid: 0 }),
        })
      );
    });

    it("dispatches to exportReservations with active", async () => {
      vi.mocked(db.reservation.findMany).mockResolvedValue([]);
      await exportData({ type: "reservations", status: "active" });
      expect(db.reservation.findMany).toHaveBeenCalled();
    });

    it("dispatches to exportAuditLog", async () => {
      vi.mocked(db.auditLog.findMany).mockResolvedValue([]);
      await exportData({ type: "audit" });
      expect(db.auditLog.findMany).toHaveBeenCalled();
    });

    it("throws on unknown type", async () => {
      await expect(
        exportData({ type: "unknown" as any })
      ).rejects.toThrow("Unknown export type");
    });

    it("parses date strings into Date objects", async () => {
      vi.mocked(db.book.findMany).mockResolvedValue([]);
      await exportData({ type: "books", from: "2024-01-01", to: "2024-12-31" });
      expect(db.book.findMany).toHaveBeenCalled();
    });
  });

  // ===== Filename & metadata =====
  describe("ExportResult metadata", () => {
    it("generates correct filename pattern", async () => {
      vi.mocked(db.book.findMany).mockResolvedValue([]);
      const result = await exportBooks();
      expect(result.filename).toMatch(/^buku-export-\d{4}-\d{2}-\d{2}\.csv$/);
    });

    it("includes generatedAt timestamp", async () => {
      vi.mocked(db.book.findMany).mockResolvedValue([]);
      const before = Date.now();
      const result = await exportBooks();
      const after = Date.now();
      expect(result.generatedAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.generatedAt.getTime()).toBeLessThanOrEqual(after);
    });

    it("uses correct mime type for CSV", async () => {
      vi.mocked(db.book.findMany).mockResolvedValue([]);
      const result = await exportBooks();
      expect(result.mimeType).toContain("text/csv");
    });
  });

  // ===== Edge cases =====
  describe("edge cases", () => {
    it("handles members with missing user", async () => {
      vi.mocked(db.member.findMany).mockResolvedValue([
        {
          id: "m-orphan",
          fullName: "Orphan",
          phone: null,
          category: "STUDENT",
          status: "ACTIVE",
          joinDate: new Date(),
          user: null,
          _count: { loans: 0 },
        },
      ] as any);

      const result = await exportMembers();
      expect(result.content).toContain("Orphan");
      // Role should be empty
      const lines = result.content.split("\n");
      expect(lines[1].split(",")).toContain("");
    });

    it("handles large loan list (capped at 10000)", async () => {
      vi.mocked(db.loan.findMany).mockResolvedValue([]);
      await exportLoans();
      const call = vi.mocked(db.loan.findMany).mock.calls[0][0] as any;
      expect(call.take).toBe(10000);
    });

    it("CSV escapes commas in book titles", async () => {
      vi.mocked(db.book.findMany).mockResolvedValue([
        {
          id: "b-comma",
          title: "Hello, World!",
          isbn: null,
          year: 2020,
          author: "",
          publisher: null,
          status: "ACTIVE",
          category: null,
          location: null,
          items: [],
        },
      ] as any);

      const result = await exportBooks();
      expect(result.content).toContain('"Hello, World!"');
    });
  });
});
