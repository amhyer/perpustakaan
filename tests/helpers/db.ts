/**
 * Test helpers untuk integration tests.
 *
 * Setup test database, seed data, cleanup.
 */

import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient | undefined;

export function getTestDb(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || "file:./db/test.db",
        },
      },
    });
  }
  return prisma;
}

export async function cleanupTestDb() {
  const db = getTestDb();
  // Hapus data dalam urutan yang benar (FK constraints)
  await db.auditLogArchive.deleteMany();
  await db.auditLog.deleteMany();
  await db.notification.deleteMany();
  await db.apiKey.deleteMany();
  await db.assetLoan.deleteMany();
  await db.asset.deleteMany();
  await db.roomBooking.deleteMany();
  await db.libraryRoom.deleteMany();
  await db.visitor.deleteMany();
  await db.wishlist.deleteMany();
  await db.bookReview.deleteMany();
  await db.reservation.deleteMany();
  await db.loan.deleteMany();
  await db.bookAttachment.deleteMany();
  await db.bookItem.deleteMany();
  await db.bookTransfer.deleteMany();
  await db.bookProposal.deleteMany();
  await db.book.deleteMany();
  await db.category.deleteMany();
  await db.location.deleteMany();
  await db.libraryHoliday.deleteMany();
  await db.publisher.deleteMany();
  await db.author.deleteMany();
  await db.stocktakingScan.deleteMany();
  await db.stocktakingSession.deleteMany();
  await db.conditionLog.deleteMany();
  await db.announcement.deleteMany();
  await db.activeSession.deleteMany();
  await db.passwordResetToken.deleteMany();
  await db.twoFactorSecret.deleteMany();
  await db.whatsAppLog.deleteMany();
  await db.emailLog.deleteMany();
  await db.errorLog.deleteMany();
  await db.setting.deleteMany();
  await db.member.deleteMany();
  await db.user.deleteMany();
}

export async function seedTestData() {
  const db = getTestDb();

  // Create test users
  const librarian = await db.user.create({
    data: {
      email: "test-librarian@school.test",
      name: "Test Librarian",
      role: "LIBRARIAN",
      passwordHash: "$2a$10$dummy.hash.for.testing.only",
    },
  });

  const student = await db.user.create({
    data: {
      email: "test-student@school.test",
      name: "Test Student",
      role: "STUDENT",
      passwordHash: "$2a$10$dummy.hash.for.testing.only",
    },
  });

  // Create member
  const member = await db.member.create({
    data: {
      userId: student.id,
      memberNumber: "TEST-001",
      fullName: "Test Student",
      category: "STUDENT",
    },
  });

  // Create category
  const category = await db.category.create({
    data: {
      name: "Test Category",
      code: "TEST",
      description: "For testing",
    },
  });

  // Create book
  const book = await db.book.create({
    data: {
      title: "Test Book",
      author: "Test Author",
      isbn: "978-0-123456-78-9",
      year: 2026,
      categoryId: category.id,
    },
  });

  // Create book items
  const item = await db.bookItem.create({
    data: {
      bookId: book.id,
      itemCode: "TEST-ITEM-001",
      status: "AVAILABLE",
    },
  });

  return { librarian, student, member, category, book, item };
}

/**
 * Create a JWT token untuk testing (without real auth)
 */
export async function createTestSessionToken(userId: string): Promise<string> {
  const { SignJWT } = await import("jose");
  const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "test-jwt-secret-for-unit-tests-only");
  return new SignJWT({ userId, email: "test@school.test", role: "STUDENT", name: "Test" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1d")
    .sign(SECRET);
}

export async function closeTestDb() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = undefined;
  }
}
