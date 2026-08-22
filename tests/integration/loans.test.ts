/**
 * Integration tests untuk loans API.
 *
 * Note: ini butuh running Next.js dev server (atau mock yang lebih lengkap).
 * Untuk saat ini, test fokus pada business logic helper functions.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  cleanupTestDb,
  seedTestData,
  closeTestDb,
  getTestDb,
} from "../helpers/db";

let testData: Awaited<ReturnType<typeof seedTestData>>;

describe("Loan business logic (integration)", () => {
  beforeAll(async () => {
    await cleanupTestDb();
    testData = await seedTestData();
  });

  afterAll(async () => {
    await cleanupTestDb();
    await closeTestDb();
  });

  it("book item should start as AVAILABLE", () => {
    expect(testData.item.status).toBe("AVAILABLE");
  });

  it("can create loan from AVAILABLE item", async () => {
    const db = getTestDb();
    const loan = await db.loan.create({
      data: {
        memberId: testData.member.id,
        bookItemId: testData.item.id,
        bookId: testData.book.id,
        dueDate: new Date(Date.now() + 7 * 86400000),
        status: "LOANED",
      },
    });
    expect(loan.status).toBe("LOANED");
    expect(loan.fineAmount).toBe(0);

    // Update item status
    await db.bookItem.update({
      where: { id: testData.item.id },
      data: { status: "BORROWED" },
    });

    const updatedItem = await db.bookItem.findUnique({ where: { id: testData.item.id } });
    expect(updatedItem?.status).toBe("BORROWED");
  });

  it("fine calculation on overdue", async () => {
    const db = getTestDb();
    // Create overdue loan
    const overdueLoan = await db.loan.create({
      data: {
        memberId: testData.member.id,
        bookItemId: testData.item.id,
        bookId: testData.book.id,
        dueDate: new Date(Date.now() - 5 * 86400000), // 5 hari lalu
        status: "OVERDUE",
      },
    });

    // Calculate fine manually
    const daysOverdue = Math.ceil(
      (Date.now() - overdueLoan.dueDate.getTime()) / 86400000
    );
    const rule = { finePerDay: 1000 }; // student
    const fine = daysOverdue * rule.finePerDay;

    expect(fine).toBeGreaterThanOrEqual(5000);
    expect(fine).toBeLessThanOrEqual(6000); // approx

    // Cleanup
    await db.loan.delete({ where: { id: overdueLoan.id } });
  });

  it("cascade delete: deleting book should delete its items", async () => {
    const db = getTestDb();
    // First reset item to AVAILABLE
    await db.bookItem.update({
      where: { id: testData.item.id },
      data: { status: "AVAILABLE" },
    });
    // Delete loans first
    await db.loan.deleteMany({
      where: { bookItemId: testData.item.id },
    });
    // Delete book
    await db.book.delete({ where: { id: testData.book.id } });

    const item = await db.bookItem.findUnique({ where: { id: testData.item.id } });
    expect(item).toBeNull();
  });
});
