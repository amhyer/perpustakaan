/**
 * Tests for bulk operations and export API endpoints.
 *
 * Sprint L-Phase 2: Bulk Operations API.
 *
 * Tests input validation, auth, and dispatch behavior.
 * Database operations are mocked.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// ===== Mocks =====
const mockRequireAuth = vi.fn();
const mockIsLibrarian = vi.fn();
const mockBulkReturnLoans = vi.fn();
const mockBulkApproveReservations = vi.fn();
const mockBulkSendNotifications = vi.fn();
const mockExportData = vi.fn();
const mockLogAudit = vi.fn();

vi.mock("@/lib/auth", () => ({
  requireAuth: () => mockRequireAuth(),
  isLibrarian: (role: string) => mockIsLibrarian(role),
}));

vi.mock("@/lib/bulk/bulk-operations", () => ({
  bulkReturnLoans: (...args: any[]) => mockBulkReturnLoans(...args),
  bulkApproveReservations: (...args: any[]) => mockBulkApproveReservations(...args),
  bulkSendNotifications: (...args: any[]) => mockBulkSendNotifications(...args),
}));

vi.mock("@/lib/data-export", () => ({
  exportData: (...args: any[]) => mockExportData(...args),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: (...args: any[]) => mockLogAudit(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { POST as returnRoute } from "../bulk/loans/return/route";
import { POST as approveRoute } from "../bulk/reservations/approve/route";
import { POST as notifyRoute } from "../bulk/notifications/send/route";
import { GET as exportRoute } from "../export/route";

const librarianUser = { id: "u1", role: "LIBRARIAN" };
const studentUser = { id: "u2", role: "STUDENT" };

function makeRequest(body: any, url = "http://localhost/api/test"): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeGet(url: string): Request {
  return new Request(url, { method: "GET" });
}

describe("POST /api/bulk/loans/return", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLibrarian.mockImplementation((role) => role === "LIBRARIAN");
  });

  it("requires authentication", async () => {
    const errResp = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    mockRequireAuth.mockResolvedValue({ user: null, error: errResp });
    const res = await returnRoute(makeRequest({ loanIds: ["l1"] }));
    expect(res.status).toBe(401);
  });

  it("rejects non-librarian", async () => {
    mockRequireAuth.mockResolvedValue({ user: studentUser, error: null });
    mockIsLibrarian.mockReturnValue(false);
    const res = await returnRoute(makeRequest({ loanIds: ["l1"] }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/pustakawan/);
  });

  it("validates loanIds is array", async () => {
    mockRequireAuth.mockResolvedValue({ user: librarianUser, error: null });
    const res = await returnRoute(makeRequest({ loanIds: "not-array" }));
    expect(res.status).toBe(400);
  });

  it("validates loanIds not empty", async () => {
    mockRequireAuth.mockResolvedValue({ user: librarianUser, error: null });
    const res = await returnRoute(makeRequest({ loanIds: [] }));
    expect(res.status).toBe(400);
  });

  it("rejects too many items", async () => {
    mockRequireAuth.mockResolvedValue({ user: librarianUser, error: null });
    const ids = Array.from({ length: 501 }, (_, i) => `l${i}`);
    const res = await returnRoute(makeRequest({ loanIds: ids }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Maksimal 500/);
  });

  it("processes bulk return successfully", async () => {
    mockRequireAuth.mockResolvedValue({ user: librarianUser, error: null });
    mockBulkReturnLoans.mockResolvedValue({
      total: 3,
      successful: 3,
      failed: 0,
      results: [
        { id: "l1", success: true },
        { id: "l2", success: true },
        { id: "l3", success: true },
      ],
    });

    const res = await returnRoute(makeRequest({ loanIds: ["l1", "l2", "l3"], reason: "Class return" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.successful).toBe(3);
    expect(body.failed).toBe(0);
    expect(mockLogAudit).toHaveBeenCalledWith(
      "u1",
      "BULK_RETURN_LOANS",
      "Loan",
      "bulk",
      expect.any(String)
    );
  });

  it("handles partial failure", async () => {
    mockRequireAuth.mockResolvedValue({ user: librarianUser, error: null });
    mockBulkReturnLoans.mockResolvedValue({
      total: 2,
      successful: 1,
      failed: 1,
      results: [
        { id: "l1", success: true },
        { id: "l2", success: false, error: "Not found" },
      ],
    });

    const res = await returnRoute(makeRequest({ loanIds: ["l1", "l2"] }));
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.successful).toBe(1);
    expect(body.failed).toBe(1);
  });

  it("handles invalid JSON body", async () => {
    mockRequireAuth.mockResolvedValue({ user: librarianUser, error: null });
    const req = new Request("http://localhost/api/test", {
      method: "POST",
      body: "not json{",
    });
    const res = await returnRoute(req);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/bulk/reservations/approve", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLibrarian.mockImplementation((role) => role === "LIBRARIAN");
  });

  it("requires authentication", async () => {
    const errResp = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    mockRequireAuth.mockResolvedValue({ user: null, error: errResp });
    const res = await approveRoute(makeRequest({ reservationIds: ["r1"] }));
    expect(res.status).toBe(401);
  });

  it("rejects non-librarian", async () => {
    mockRequireAuth.mockResolvedValue({ user: studentUser, error: null });
    mockIsLibrarian.mockReturnValue(false);
    const res = await approveRoute(makeRequest({ reservationIds: ["r1"] }));
    expect(res.status).toBe(403);
  });

  it("validates input", async () => {
    mockRequireAuth.mockResolvedValue({ user: librarianUser, error: null });
    const res = await approveRoute(makeRequest({ reservationIds: [] }));
    expect(res.status).toBe(400);
  });

  it("caps at 500 items", async () => {
    mockRequireAuth.mockResolvedValue({ user: librarianUser, error: null });
    const ids = Array.from({ length: 501 }, (_, i) => `r${i}`);
    const res = await approveRoute(makeRequest({ reservationIds: ids }));
    expect(res.status).toBe(400);
  });

  it("approves reservations successfully", async () => {
    mockRequireAuth.mockResolvedValue({ user: librarianUser, error: null });
    mockBulkApproveReservations.mockResolvedValue({
      total: 2,
      successful: 2,
      failed: 0,
      results: [
        { id: "r1", success: true },
        { id: "r2", success: true },
      ],
    });

    const res = await approveRoute(makeRequest({ reservationIds: ["r1", "r2"] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockBulkApproveReservations).toHaveBeenCalledWith(
      ["r1", "r2"],
      true,
      expect.objectContaining({ userId: "u1" })
    );
    expect(mockLogAudit).toHaveBeenCalled();
  });
});

describe("POST /api/bulk/notifications/send", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLibrarian.mockImplementation((role) => role === "LIBRARIAN");
  });

  it("requires authentication", async () => {
    const errResp = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    mockRequireAuth.mockResolvedValue({ user: null, error: errResp });
    const res = await notifyRoute(makeRequest({ userIds: ["u1"], notification: { title: "t", message: "m" } }));
    expect(res.status).toBe(401);
  });

  it("rejects non-librarian", async () => {
    mockRequireAuth.mockResolvedValue({ user: studentUser, error: null });
    mockIsLibrarian.mockReturnValue(false);
    const res = await notifyRoute(makeRequest({ userIds: ["u1"], notification: { title: "t", message: "m" } }));
    expect(res.status).toBe(403);
  });

  it("validates userIds", async () => {
    mockRequireAuth.mockResolvedValue({ user: librarianUser, error: null });
    const res = await notifyRoute(makeRequest({ userIds: [], notification: { title: "t", message: "m" } }));
    expect(res.status).toBe(400);
  });

  it("requires title and message", async () => {
    mockRequireAuth.mockResolvedValue({ user: librarianUser, error: null });
    const res = await notifyRoute(makeRequest({ userIds: ["u1"], notification: {} }));
    expect(res.status).toBe(400);
  });

  it("validates title length", async () => {
    mockRequireAuth.mockResolvedValue({ user: librarianUser, error: null });
    const res = await notifyRoute(
      makeRequest({ userIds: ["u1"], notification: { title: "a".repeat(201), message: "m" } })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/200 karakter/);
  });

  it("validates message length", async () => {
    mockRequireAuth.mockResolvedValue({ user: librarianUser, error: null });
    const res = await notifyRoute(
      makeRequest({ userIds: ["u1"], notification: { title: "t", message: "m".repeat(1001) } })
    );
    expect(res.status).toBe(400);
  });

  it("caps at 5000 recipients", async () => {
    mockRequireAuth.mockResolvedValue({ user: librarianUser, error: null });
    const userIds = Array.from({ length: 5001 }, (_, i) => `u${i}`);
    const res = await notifyRoute(
      makeRequest({ userIds, notification: { title: "t", message: "m" } })
    );
    expect(res.status).toBe(400);
  });

  it("sends notification successfully", async () => {
    mockRequireAuth.mockResolvedValue({ user: librarianUser, error: null });
    mockBulkSendNotifications.mockResolvedValue({
      total: 3,
      successful: 3,
      failed: 0,
      results: [],
    });

    const res = await notifyRoute(
      makeRequest({
        userIds: ["u1", "u2", "u3"],
        notification: { title: "Info", message: "Halo semua", type: "INFO" },
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.successful).toBe(3);
    expect(mockLogAudit).toHaveBeenCalledWith(
      "u1",
      "BULK_SEND_NOTIFICATIONS",
      "Notification",
      "bulk",
      expect.any(String)
    );
  });

  it("defaults invalid type to INFO", async () => {
    mockRequireAuth.mockResolvedValue({ user: librarianUser, error: null });
    mockBulkSendNotifications.mockResolvedValue({
      total: 1,
      successful: 1,
      failed: 0,
      results: [],
    });

    await notifyRoute(
      makeRequest({
        userIds: ["u1"],
        notification: { title: "t", message: "m", type: "INVALID_TYPE" },
      })
    );
    expect(mockBulkSendNotifications).toHaveBeenCalledWith(
      ["u1"],
      expect.objectContaining({ type: "INFO" }),
      expect.anything()
    );
  });
});

describe("GET /api/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLibrarian.mockImplementation((role) => role === "LIBRARIAN");
  });

  it("requires authentication", async () => {
    const errResp = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    mockRequireAuth.mockResolvedValue({ user: null, error: errResp });
    const res = await exportRoute(makeGet("http://localhost/api/export?type=books"));
    expect(res.status).toBe(401);
  });

  it("rejects non-librarian", async () => {
    mockRequireAuth.mockResolvedValue({ user: studentUser, error: null });
    mockIsLibrarian.mockReturnValue(false);
    const res = await exportRoute(makeGet("http://localhost/api/export?type=books"));
    expect(res.status).toBe(403);
  });

  it("requires type parameter", async () => {
    mockRequireAuth.mockResolvedValue({ user: librarianUser, error: null });
    const res = await exportRoute(makeGet("http://localhost/api/export"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.validTypes).toContain("books");
  });

  it("rejects unknown type", async () => {
    mockRequireAuth.mockResolvedValue({ user: librarianUser, error: null });
    const res = await exportRoute(makeGet("http://localhost/api/export?type=foo"));
    expect(res.status).toBe(400);
  });

  it("validates from date format", async () => {
    mockRequireAuth.mockResolvedValue({ user: librarianUser, error: null });
    const res = await exportRoute(makeGet("http://localhost/api/export?type=books&from=notadate"));
    expect(res.status).toBe(400);
  });

  it("validates to date format", async () => {
    mockRequireAuth.mockResolvedValue({ user: librarianUser, error: null });
    const res = await exportRoute(makeGet("http://localhost/api/export?type=books&to=garbage"));
    expect(res.status).toBe(400);
  });

  it("exports books as CSV", async () => {
    mockRequireAuth.mockResolvedValue({ user: librarianUser, error: null });
    mockExportData.mockResolvedValue({
      filename: "buku-export-2024-01-01.csv",
      content: "id,judul\nb1,Test",
      rowCount: 1,
      mimeType: "text/csv;charset=utf-8;",
      generatedAt: new Date("2024-01-01"),
    });

    const res = await exportRoute(makeGet("http://localhost/api/export?type=books"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    expect(res.headers.get("Content-Disposition")).toContain("attachment");
    expect(res.headers.get("Content-Disposition")).toContain("buku-export");
    expect(res.headers.get("X-Row-Count")).toBe("1");
    const text = await res.text();
    expect(text).toContain("b1,Test");
  });

  it("passes anonymize flag for members", async () => {
    mockRequireAuth.mockResolvedValue({ user: librarianUser, error: null });
    mockExportData.mockResolvedValue({
      filename: "anggota.csv",
      content: "id,nama",
      rowCount: 0,
      mimeType: "text/csv;charset=utf-8;",
      generatedAt: new Date(),
    });

    await exportRoute(
      makeGet("http://localhost/api/export?type=members&anonymize=true")
    );
    expect(mockExportData).toHaveBeenCalledWith(
      expect.objectContaining({ type: "members", anonymize: true })
    );
  });

  it("passes status for loans", async () => {
    mockRequireAuth.mockResolvedValue({ user: librarianUser, error: null });
    mockExportData.mockResolvedValue({
      filename: "loans.csv",
      content: "",
      rowCount: 0,
      mimeType: "text/csv;charset=utf-8;",
      generatedAt: new Date(),
    });

    await exportRoute(
      makeGet("http://localhost/api/export?type=loans&status=OVERDUE")
    );
    expect(mockExportData).toHaveBeenCalledWith(
      expect.objectContaining({ type: "loans", status: "OVERDUE" })
    );
  });

  it("passes only-unpaid for fines", async () => {
    mockRequireAuth.mockResolvedValue({ user: librarianUser, error: null });
    mockExportData.mockResolvedValue({
      filename: "fines.csv",
      content: "",
      rowCount: 0,
      mimeType: "text/csv;charset=utf-8;",
      generatedAt: new Date(),
    });

    await exportRoute(
      makeGet("http://localhost/api/export?type=fines&status=unpaid")
    );
    expect(mockExportData).toHaveBeenCalledWith(
      expect.objectContaining({ type: "fines", status: "unpaid" })
    );
  });

  it("logs audit on export", async () => {
    mockRequireAuth.mockResolvedValue({ user: librarianUser, error: null });
    mockExportData.mockResolvedValue({
      filename: "books.csv",
      content: "",
      rowCount: 5,
      mimeType: "text/csv;charset=utf-8;",
      generatedAt: new Date(),
    });

    await exportRoute(makeGet("http://localhost/api/export?type=books"));
    expect(mockLogAudit).toHaveBeenCalledWith(
      "u1",
      "EXPORT_DATA",
      "books",
      "export",
      expect.any(String)
    );
  });

  it("handles export errors gracefully", async () => {
    mockRequireAuth.mockResolvedValue({ user: librarianUser, error: null });
    mockExportData.mockRejectedValue(new Error("DB connection lost"));

    const res = await exportRoute(makeGet("http://localhost/api/export?type=books"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/Gagal/);
    expect(body.detail).toBe("DB connection lost");
  });
});

// NextResponse import for tests
import { NextResponse } from "next/server";
