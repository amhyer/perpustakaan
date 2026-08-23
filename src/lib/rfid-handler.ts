/**
 * RFID Handler — IoT auto-checkout business logic.
 *
 * Flow:
 * 1. Reader sends scan event (POST /api/rfid/scan)
 * 2. Handler identifies member by card UID
 * 3. Determines event type based on reader type & context:
 *    - Entrance reader: CHECKIN (presence tracking)
 *    - Exit reader: CHECKOUT (return)
 *    - Circulation desk: CHECKOUT_BOOK (with book tag)
 * 4. Processes event (create loan, return, log)
 * 5. Returns response with beep/LED instructions for reader
 *
 * Anti-fraud:
 * - Debounce: same card within 2s = ignore
 * - Card active check
 * - Card expiry check
 * - Member status check (ACTIVE only)
 *
 * Use cases:
 * - Entrance: tap masuk = catat visitor
 * - Exit: tap keluar (atau dengan buku) = process return
 * - Circulation: tap kartu + tap buku = auto-checkout
 */

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { cache } from "@/lib/cache";
import { eventBus, EVENTS } from "@/lib/event-bus";
import { logAudit } from "@/lib/audit";
import { computeDueDateWithHolidays, getLoanRule } from "@/lib/loan-rules";
import { createHash } from "crypto";

// ===== Types =====

export type ReaderType = "CHECKIN" | "CHECKOUT" | "BOTH" | "EXIT";
export type EventType =
  | "CHECKIN"
  | "CHECKOUT"
  | "CHECKOUT_BOOK"
  | "RETURN"
  | "EXIT"
  | "UNKNOWN_CARD"
  | "INACTIVE_CARD"
  | "EXPIRED_CARD"
  | "ERROR"
  | "DEBOUNCED";
export type EventStatus = "OK" | "DENIED" | "ERROR" | "DUPLICATE";

export interface RFIDScanInput {
  /** Reader code (unique identifier) */
  readerCode: string;
  /** Card UID from reader */
  uid: string;
  /** Optional book tag UID if scanning a book too */
  bookTagUid?: string;
  /** When the scan happened (from reader clock) */
  scannedAt?: string;
  /** Raw data for debugging */
  rawData?: Record<string, any>;
  /** API key (for authentication) */
  apiKey?: string;
}

export interface RFIDResponse {
  success: boolean;
  eventType: EventType;
  status: EventStatus;
  message: string;
  /** Member info if recognized */
  member?: {
    id: string;
    memberNumber: string;
    fullName: string;
    category: string;
  };
  /** Book info if CHECKOUT_BOOK */
  book?: {
    id: string;
    itemCode: string;
    title: string;
  };
  /** Loan info if created/affected */
  loan?: {
    id: string;
    dueDate: string;
  };
  /** Reader response (beep/LED) */
  readerResponse: {
    beep: boolean;
    led: "GREEN" | "RED" | "BLUE" | "NONE";
    duration?: number;
  };
}

// ===== Constants =====

const DEBOUNCE_WINDOW_MS = 2_000; // 2 seconds
const CACHE_TTL_SECONDS = 60;

// ===== Helpers =====

function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

function getDebounceKey(uid: string, readerCode: string): string {
  return `rfid:debounce:${readerCode}:${uid}`;
}

function getEventCountKey(uid: string): string {
  return `rfid:count:${uid}`;
}

// ===== Reader Management =====

export interface ReaderStatus {
  id: string;
  code: string;
  name: string;
  type: ReaderType;
  isOnline: boolean;
  lastSeenAt: string | null;
  batteryLevel: number | null;
  todayEventCount: number;
}

export async function getReaderStatus(readerCode: string): Promise<ReaderStatus | null> {
  try {
    const reader = await db.rFIDReader.findUnique({
      where: { code: readerCode },
      include: {
        _count: {
          select: {
            events: {
              where: {
                receivedAt: {
                  gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                },
              },
            },
          },
        },
      },
    });
    if (!reader) return null;
    return {
      id: reader.id,
      code: reader.code,
      name: reader.name,
      type: reader.type as ReaderType,
      isOnline: reader.isOnline,
      lastSeenAt: reader.lastSeenAt?.toISOString() || null,
      batteryLevel: reader.batteryLevel,
      todayEventCount: reader._count.events,
    };
  } catch {
    return null;
  }
}

export async function getAllReaders(): Promise<ReaderStatus[]> {
  try {
    const readers = await db.rFIDReader.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            events: {
              where: {
                receivedAt: {
                  gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                },
              },
            },
          },
        },
      },
    });
    return readers.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      type: r.type as ReaderType,
      isOnline: r.isOnline,
      lastSeenAt: r.lastSeenAt?.toISOString() || null,
      batteryLevel: r.batteryLevel,
      todayEventCount: r._count.events,
    }));
  } catch {
    return [];
  }
}

// ===== Card Lookup =====

export interface CardInfo {
  id: string;
  uid: string;
  memberId: string;
  member: {
    id: string;
    memberNumber: string;
    fullName: string;
    category: string;
    status: string;
    photo?: string | null;
  };
  isActive: boolean;
  expiresAt: string | null;
  isExpired: boolean;
}

export async function lookupCard(uid: string): Promise<CardInfo | null> {
  try {
    const card = await db.rFIDCard.findUnique({
      where: { uid },
      include: {
        member: {
          select: {
            id: true,
            memberNumber: true,
            fullName: true,
            category: true,
            status: true,
            photo: true,
          },
        },
      },
    });
    if (!card) return null;

    const isExpired = card.expiresAt ? new Date(card.expiresAt) < new Date() : false;
    return {
      id: card.id,
      uid: card.uid,
      memberId: card.memberId,
      member: card.member,
      isActive: card.isActive,
      expiresAt: card.expiresAt?.toISOString() || null,
      isExpired,
    };
  } catch {
    return null;
  }
}

// ===== Book Tag Lookup =====

export interface BookInfo {
  bookItemId: string;
  bookId: string;
  itemCode: string;
  title: string;
  author: string;
  status: string; // AVAILABLE | BORROWED | ...
}

export async function lookupBookTag(tagUid: string): Promise<BookInfo | null> {
  try {
    const tag = await db.bookItemTag.findUnique({
      where: { tagUid },
      include: {
        bookItem: {
          include: {
            book: { select: { id: true, title: true, author: true } },
          },
        },
      },
    });
    if (!tag || !tag.isActive) return null;
    return {
      bookItemId: tag.bookItem.id,
      bookId: tag.bookItem.book.id,
      itemCode: tag.bookItem.itemCode,
      title: tag.bookItem.book.title,
      author: tag.bookItem.book.author,
      status: tag.bookItem.status,
    };
  } catch {
    return null;
  }
}

// ===== Main Handler =====

/**
 * Main entry: process a scan event.
 */
export async function handleRFIDScan(input: RFIDScanInput): Promise<RFIDResponse> {
  const startTime = Date.now();

  try {
    // 1. Validate reader (find by code, check API key)
    const reader = await db.rFIDReader.findUnique({
      where: { code: input.readerCode },
    });
    if (!reader) {
      return {
        success: false,
        eventType: "ERROR",
        status: "ERROR",
        message: `Reader "${input.readerCode}" tidak terdaftar`,
        readerResponse: { beep: true, led: "RED", duration: 500 },
      };
    }
    if (!reader.isActive) {
      return {
        success: false,
        eventType: "ERROR",
        status: "ERROR",
        message: "Reader tidak aktif",
        readerResponse: { beep: true, led: "RED", duration: 500 },
      };
    }

    // Verify API key if configured
    if (reader.apiKeyHash && input.apiKey) {
      const inputHash = hashApiKey(input.apiKey);
      if (inputHash !== reader.apiKeyHash) {
        return {
          success: false,
          eventType: "ERROR",
          status: "DENIED",
          message: "API key tidak valid",
          readerResponse: { beep: true, led: "RED", duration: 300 },
        };
      }
    }

    // 2. Update reader status (online + last seen)
    await db.rFIDReader.update({
      where: { id: reader.id },
      data: {
        isOnline: true,
        lastSeenAt: new Date(),
      },
    });

    // 3. Debounce check
    const debounceKey = getDebounceKey(input.uid, input.readerCode);
    if (cache.get(debounceKey)) {
      return {
        success: false,
        eventType: "DEBOUNCED",
        status: "DUPLICATE",
        message: "Tap duplikat (debounced)",
        readerResponse: { beep: false, led: "NONE" },
      };
    }
    cache.set(debounceKey, true, DEBOUNCE_WINDOW_MS);

    // 4. Lookup card
    const card = await lookupCard(input.uid);
    const scannedAt = input.scannedAt ? new Date(input.scannedAt) : new Date();

    if (!card) {
      // Unknown card
      await saveEvent({
        readerId: reader.id,
        cardId: null,
        uid: input.uid,
        eventType: "UNKNOWN_CARD",
        status: "DENIED",
        message: `Kartu dengan UID ${input.uid} tidak terdaftar`,
        scannedAt,
        rawData: input.rawData,
      });
      return {
        success: false,
        eventType: "UNKNOWN_CARD",
        status: "DENIED",
        message: "Kartu tidak dikenal. Hubungi pustakawan.",
        readerResponse: { beep: true, led: "RED", duration: 500 },
      };
    }

    // 5. Check card status
    if (!card.isActive) {
      await saveEvent({
        readerId: reader.id,
        cardId: card.id,
        uid: input.uid,
        eventType: "INACTIVE_CARD",
        status: "DENIED",
        memberId: card.memberId,
        message: `Kartu nonaktif: ${card.member.fullName}`,
        scannedAt,
        rawData: input.rawData,
      });
      return {
        success: false,
        eventType: "INACTIVE_CARD",
        status: "DENIED",
        message: "Kartu tidak aktif",
        member: {
          id: card.member.id,
          memberNumber: card.member.memberNumber,
          fullName: card.member.fullName,
          category: card.member.category,
        },
        readerResponse: { beep: true, led: "RED", duration: 500 },
      };
    }

    if (card.isExpired) {
      await saveEvent({
        readerId: reader.id,
        cardId: card.id,
        uid: input.uid,
        eventType: "EXPIRED_CARD",
        status: "DENIED",
        memberId: card.memberId,
        message: `Kartu kadaluarsa: ${card.member.fullName}`,
        scannedAt,
        rawData: input.rawData,
      });
      return {
        success: false,
        eventType: "EXPIRED_CARD",
        status: "DENIED",
        message: "Kartu sudah kadaluarsa. Perpanjang di pustakawan.",
        member: {
          id: card.member.id,
          memberNumber: card.member.memberNumber,
          fullName: card.member.fullName,
          category: card.member.category,
        },
        readerResponse: { beep: true, led: "RED", duration: 500 },
      };
    }

    if (card.member.status !== "ACTIVE") {
      await saveEvent({
        readerId: reader.id,
        cardId: card.id,
        uid: input.uid,
        eventType: "INACTIVE_CARD",
        status: "DENIED",
        memberId: card.memberId,
        message: `Member nonaktif: ${card.member.fullName}`,
        scannedAt,
        rawData: input.rawData,
      });
      return {
        success: false,
        eventType: "INACTIVE_CARD",
        status: "DENIED",
        message: "Keanggotaan tidak aktif",
        member: {
          id: card.member.id,
          memberNumber: card.member.memberNumber,
          fullName: card.member.fullName,
          category: card.member.category,
        },
        readerResponse: { beep: true, led: "RED", duration: 500 },
      };
    }

    // 6. Determine event type based on reader type
    const readerType = reader.type as ReaderType;
    let eventType: EventType;
    if (input.bookTagUid) {
      eventType = "CHECKOUT_BOOK";
    } else if (readerType === "CHECKIN") {
      eventType = "CHECKIN";
    } else if (readerType === "EXIT") {
      eventType = "EXIT";
    } else if (readerType === "CHECKOUT") {
      eventType = "CHECKOUT";
    } else {
      // BOTH: decide based on time of day (8-14 = checkout, 14-16 = checkin)
      const hour = new Date().getHours();
      eventType = hour < 14 ? "CHECKIN" : "CHECKOUT";
    }

    // 7. Process event
    const result = await processEvent({
      reader,
      card,
      eventType,
      bookTagUid: input.bookTagUid,
      scannedAt,
      rawData: input.rawData,
    });

    // 8. Update card usage
    await db.rFIDCard.update({
      where: { id: card.id },
      data: {
        lastUsedAt: new Date(),
        usageCount: { increment: 1 },
      },
    });

    logger.info("RFID scan processed", {
      readerCode: input.readerCode,
      uid: input.uid,
      eventType,
      status: result.status,
      duration: Date.now() - startTime,
    });

    return result;
  } catch (err) {
    logger.error("RFID handler error", { error: String(err), input });
    return {
      success: false,
      eventType: "ERROR",
      status: "ERROR",
      message: "Terjadi kesalahan sistem",
      readerResponse: { beep: true, led: "RED", duration: 500 },
    };
  }
}

// ===== Event Processing =====

interface ProcessEventInput {
  reader: { id: string; code: string; name: string; type: string };
  card: CardInfo;
  eventType: EventType;
  bookTagUid?: string;
  scannedAt: Date;
  rawData?: Record<string, any>;
}

async function processEvent(input: ProcessEventInput): Promise<RFIDResponse> {
  const { reader, card, eventType, bookTagUid, scannedAt } = input;
  const memberInfo = {
    id: card.member.id,
    memberNumber: card.member.memberNumber,
    fullName: card.member.fullName,
    category: card.member.category,
  };

  // CHECKIN: just record presence
  if (eventType === "CHECKIN") {
    // Optional: create visitor record
    try {
      await db.visitor.create({
        data: {
          memberId: card.memberId,
          name: card.member.fullName,
          purpose: "Baca",
        },
      });
    } catch {
      // ignore
    }

    // Broadcast
    eventBus.broadcast(EVENTS.VISITOR_CHECKIN, {
      memberId: card.memberId,
      name: card.member.fullName,
      timestamp: scannedAt.toISOString(),
    });

    await saveEvent({
      readerId: reader.id,
      cardId: card.id,
      uid: card.uid,
      eventType: "CHECKIN",
      status: "OK",
      memberId: card.memberId,
      message: `Check-in: ${card.member.fullName}`,
      scannedAt,
      rawData: input.rawData,
    });

    return {
      success: true,
      eventType: "CHECKIN",
      status: "OK",
      message: `Selamat datang, ${card.member.fullName}!`,
      member: memberInfo,
      readerResponse: { beep: true, led: "GREEN", duration: 200 },
    };
  }

  // CHECKOUT_BOOK: create loan
  if (eventType === "CHECKOUT_BOOK" && bookTagUid) {
    const book = await lookupBookTag(bookTagUid);
    if (!book) {
      await saveEvent({
        readerId: reader.id,
        cardId: card.id,
        uid: card.uid,
        eventType: "CHECKOUT_BOOK",
        status: "ERROR",
        memberId: card.memberId,
        message: `Tag buku ${bookTagUid} tidak ditemukan`,
        scannedAt,
        rawData: input.rawData,
      });
      return {
        success: false,
        eventType: "ERROR",
        status: "ERROR",
        message: "Buku tidak dikenali. Hubungi pustakawan.",
        member: memberInfo,
        readerResponse: { beep: true, led: "RED", duration: 500 },
      };
    }

    if (book.status !== "AVAILABLE") {
      await saveEvent({
        readerId: reader.id,
        cardId: card.id,
        uid: card.uid,
        eventType: "CHECKOUT_BOOK",
        status: "DENIED",
        memberId: card.memberId,
        bookItemId: book.bookItemId,
        message: `Buku "${book.title}" tidak tersedia (status: ${book.status})`,
        scannedAt,
        rawData: input.rawData,
      });
      return {
        success: false,
        eventType: "ERROR",
        status: "DENIED",
        message: `Buku "${book.title}" sedang ${book.status.toLowerCase()}`,
        member: memberInfo,
        book: {
          id: book.bookItemId,
          itemCode: book.itemCode,
          title: book.title,
        },
        readerResponse: { beep: true, led: "RED", duration: 500 },
      };
    }

    // Compute due date
    const { dueDate } = await computeDueDateWithHolidays(new Date(), card.member.category);

    // Create loan
    const loan = await db.loan.create({
      data: {
        memberId: card.memberId,
        bookItemId: book.bookItemId,
        bookId: book.bookId,
        dueDate,
        status: "LOANED",
      },
    });

    // Update book item status
    await db.bookItem.update({
      where: { id: book.bookItemId },
      data: { status: "BORROWED" },
    });

    // Audit
    await logAudit(
      card.memberId,
      "LOAN_CREATE",
      "Loan",
      loan.id,
      `RFID auto-checkout: ${card.member.fullName} → ${book.title} (${reader.code})`,
    );

    // Update book tag last scanned
    await db.bookItemTag.update({
      where: { tagUid: bookTagUid },
      data: { lastScannedAt: new Date() },
    });

    // Event
    eventBus.publish(card.memberId, EVENTS.LOAN_CREATED, {
      loanId: loan.id,
      bookTitle: book.title,
      dueDate: dueDate.toISOString(),
      method: "RFID",
    });

    await saveEvent({
      readerId: reader.id,
      cardId: card.id,
      uid: card.uid,
      eventType: "CHECKOUT_BOOK",
      status: "OK",
      memberId: card.memberId,
      bookItemId: book.bookItemId,
      loanId: loan.id,
      message: `Check-out: ${book.title} → ${card.member.fullName}`,
      scannedAt,
      rawData: input.rawData,
    });

    return {
      success: true,
      eventType: "CHECKOUT_BOOK",
      status: "OK",
      message: `Berhasil pinjam "${book.title}". Jatuh tempo: ${dueDate.toLocaleDateString("id-ID")}`,
      member: memberInfo,
      book: {
        id: book.bookItemId,
        itemCode: book.itemCode,
        title: book.title,
      },
      loan: {
        id: loan.id,
        dueDate: dueDate.toISOString(),
      },
      readerResponse: { beep: true, led: "GREEN", duration: 300 },
    };
  }

  // CHECKOUT / EXIT: record event but don't create loan
  await saveEvent({
    readerId: reader.id,
    cardId: card.id,
    uid: card.uid,
    eventType,
    status: "OK",
    memberId: card.memberId,
    message: `${eventType}: ${card.member.fullName}`,
    scannedAt,
    rawData: input.rawData,
  });

  return {
    success: true,
    eventType,
    status: "OK",
    message:
      eventType === "EXIT"
        ? `Sampai jumpa, ${card.member.fullName}!`
        : `Halo, ${card.member.fullName}! Tap buku untuk pinjam.`,
    member: memberInfo,
    readerResponse: { beep: true, led: "BLUE", duration: 200 },
  };
}

// ===== Save Event Helper =====

interface SaveEventInput {
  readerId: string;
  cardId: string | null;
  uid: string;
  eventType: string;
  status: string;
  memberId?: string;
  message?: string;
  bookItemId?: string;
  loanId?: string;
  scannedAt: Date;
  rawData?: Record<string, any>;
}

async function saveEvent(input: SaveEventInput) {
  try {
    await db.rFIDEvent.create({
      data: {
        ...input,
        rawData: input.rawData ? JSON.stringify(input.rawData) : null,
        processedAt: new Date(),
      },
    });
  } catch (err) {
    logger.warn("Failed to save RFID event", { error: String(err) });
  }
}

// ===== Statistics =====

export interface RFIDStats {
  today: {
    totalScans: number;
    checkIns: number;
    checkouts: number;
    uniqueMembers: number;
    denied: number;
  };
  readers: {
    online: number;
    offline: number;
    total: number;
  };
  topMembers: { memberNumber: string; fullName: string; scanCount: number }[];
}

export async function getRFIDStats(): Promise<RFIDStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  try {
    const [events, readers] = await Promise.all([
      db.rFIDEvent.findMany({
        where: {
          receivedAt: { gte: today, lt: tomorrow },
        },
        include: {
          card: { include: { member: true } },
        },
      }),
      db.rFIDReader.findMany({ where: { isActive: true } }),
    ]);

    const checkIns = events.filter((e) => e.eventType === "CHECKIN").length;
    const checkouts = events.filter((e) => e.eventType === "CHECKOUT_BOOK").length;
    const denied = events.filter((e) => e.status === "DENIED").length;
    const uniqueMemberIds = new Set(
      events.filter((e) => e.memberId).map((e) => e.memberId)
    );

    // Top members (by usage count)
    const memberCount = new Map<string, { name: string; count: number; num: string }>();
    for (const e of events) {
      if (e.memberId && e.card?.member) {
        const existing = memberCount.get(e.memberId);
        if (existing) {
          existing.count++;
        } else {
          memberCount.set(e.memberId, {
            name: e.card.member.fullName,
            count: 1,
            num: e.card.member.memberNumber,
          });
        }
      }
    }
    const topMembers = Array.from(memberCount.entries())
      .map(([_, v]) => ({
        memberNumber: v.num,
        fullName: v.name,
        scanCount: v.count,
      }))
      .sort((a, b) => b.scanCount - a.scanCount)
      .slice(0, 10);

    return {
      today: {
        totalScans: events.length,
        checkIns,
        checkouts,
        uniqueMembers: uniqueMemberIds.size,
        denied,
      },
      readers: {
        online: readers.filter((r) => r.isOnline).length,
        offline: readers.filter((r) => !r.isOnline).length,
        total: readers.length,
      },
      topMembers,
    };
  } catch {
    return {
      today: { totalScans: 0, checkIns: 0, checkouts: 0, uniqueMembers: 0, denied: 0 },
      readers: { online: 0, offline: 0, total: 0 },
      topMembers: [],
    };
  }
}

// ===== Event Log =====

export interface EventLogEntry {
  id: string;
  uid: string;
  eventType: string;
  status: string;
  memberName?: string;
  memberNumber?: string;
  bookTitle?: string;
  message?: string;
  scannedAt: string;
  readerCode: string;
  isDebounced: boolean;
}

export async function getEventLog(limit = 50, filters?: {
  readerCode?: string;
  eventType?: string;
  memberId?: string;
}): Promise<EventLogEntry[]> {
  try {
    const where: any = {};
    if (filters?.readerCode) {
      const reader = await db.rFIDReader.findUnique({ where: { code: filters.readerCode } });
      if (reader) where.readerId = reader.id;
    }
    if (filters?.eventType) where.eventType = filters.eventType;
    if (filters?.memberId) where.memberId = filters.memberId;

    const events = await db.rFIDEvent.findMany({
      where,
      orderBy: { receivedAt: "desc" },
      take: limit,
      include: {
        reader: { select: { code: true } },
        card: {
          include: {
            member: { select: { fullName: true, memberNumber: true } },
          },
        },
      },
    });

    return events.map((e) => ({
      id: e.id,
      uid: e.uid,
      eventType: e.eventType,
      status: e.status,
      memberName: e.card?.member?.fullName,
      memberNumber: e.card?.member?.memberNumber,
      bookTitle: undefined,
      message: e.message || undefined,
      scannedAt: e.scannedAt.toISOString(),
      readerCode: e.reader.code,
      isDebounced: e.isDebounced,
    }));
  } catch {
    return [];
  }
}
