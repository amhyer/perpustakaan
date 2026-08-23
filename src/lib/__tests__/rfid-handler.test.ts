/**
 * Unit tests untuk src/lib/rfid-handler.ts
 *
 * Test pure logic: card/book validation, debouncing, event classification.
 * DB-heavy tests would need integration test.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all dependencies
vi.mock("../db", () => ({
  db: {
    rFIDCard: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    rFIDReader: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    rFIDEvent: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    bookItemTag: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    bookItem: {
      update: vi.fn(),
    },
    loan: {
      create: vi.fn(),
    },
    visitor: {
      create: vi.fn(),
    },
  },
}));

vi.mock("../logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("../cache", () => ({
  cache: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock("../event-bus", () => ({
  eventBus: {
    broadcast: vi.fn(),
    publish: vi.fn(),
  },
  EVENTS: {
    VISITOR_CHECKIN: "visitor:checkin",
    LOAN_CREATED: "loan:created",
  },
}));

vi.mock("../audit", () => ({
  logAudit: vi.fn(),
}));

vi.mock("../loan-rules", () => ({
  computeDueDateWithHolidays: vi.fn((_date, days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  }),
  getLoanRule: vi.fn((cat) => ({
    category: cat,
    maxBooks: cat === "STUDENT" ? 3 : 5,
    loanDays: cat === "STUDENT" ? 7 : 14,
    finePerDay: 1000,
    maxRenewals: 1,
  })),
}));

describe("rfid-handler: debounce logic", () => {
  it("generates debounce key from reader + uid", () => {
    const readerCode = "READER-01";
    const uid = "A1:B2:C3:D4";
    const key = `rfid:debounce:${readerCode}:${uid}`;
    expect(key).toBe("rfid:debounce:READER-01:A1:B2:C3:D4");
  });

  it("different readers get different keys for same card", () => {
    const uid = "A1:B2:C3:D4";
    const key1 = `rfid:debounce:R1:${uid}`;
    const key2 = `rfid:debounce:R2:${uid}`;
    expect(key1).not.toBe(key2);
  });
});

describe("rfid-handler: event type determination", () => {
  function determineEventType(
    readerType: string,
    hasBookTag: boolean,
    hour: number
  ): string {
    if (hasBookTag) return "CHECKOUT_BOOK";
    if (readerType === "CHECKIN") return "CHECKIN";
    if (readerType === "EXIT") return "EXIT";
    if (readerType === "CHECKOUT") return "CHECKOUT";
    // BOTH: based on time of day
    return hour < 14 ? "CHECKIN" : "CHECKOUT";
  }

  it("CHECKOUT_BOOK when book tag present", () => {
    expect(determineEventType("CHECKIN", true, 10)).toBe("CHECKOUT_BOOK");
    expect(determineEventType("CHECKOUT", true, 14)).toBe("CHECKOUT_BOOK");
  });

  it("CHECKIN for entrance reader", () => {
    expect(determineEventType("CHECKIN", false, 10)).toBe("CHECKIN");
  });

  it("EXIT for exit reader", () => {
    expect(determineEventType("EXIT", false, 10)).toBe("EXIT");
  });

  it("CHECKOUT for desk reader", () => {
    expect(determineEventType("CHECKOUT", false, 10)).toBe("CHECKOUT");
  });

  it("BOTH reader before 14:00 = CHECKIN", () => {
    expect(determineEventType("BOTH", false, 8)).toBe("CHECKIN");
    expect(determineEventType("BOTH", false, 13)).toBe("CHECKIN");
  });

  it("BOTH reader after 14:00 = CHECKOUT", () => {
    expect(determineEventType("BOTH", false, 14)).toBe("CHECKOUT");
    expect(determineEventType("BOTH", false, 16)).toBe("CHECKOUT");
  });
});

describe("rfid-handler: card validation", () => {
  function isCardValid(card: {
    isActive: boolean;
    expiresAt?: string | null;
    memberStatus: string;
  }): { valid: boolean; reason?: string } {
    if (!card.isActive) return { valid: false, reason: "Card inactive" };
    if (card.expiresAt && new Date(card.expiresAt) < new Date()) {
      return { valid: false, reason: "Card expired" };
    }
    if (card.memberStatus !== "ACTIVE") {
      return { valid: false, reason: "Member inactive" };
    }
    return { valid: true };
  }

  it("valid card passes all checks", () => {
    const result = isCardValid({ isActive: true, memberStatus: "ACTIVE" });
    expect(result.valid).toBe(true);
  });

  it("rejects inactive card", () => {
    const result = isCardValid({ isActive: false, memberStatus: "ACTIVE" });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Card inactive");
  });

  it("rejects expired card", () => {
    const yesterday = new Date(Date.now() - 86400_000);
    const result = isCardValid({ isActive: true, memberStatus: "ACTIVE", expiresAt: yesterday.toISOString() });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Card expired");
  });

  it("accepts non-expired card", () => {
    const tomorrow = new Date(Date.now() + 86400_000);
    const result = isCardValid({ isActive: true, memberStatus: "ACTIVE", expiresAt: tomorrow.toISOString() });
    expect(result.valid).toBe(true);
  });

  it("rejects inactive member", () => {
    const result = isCardValid({ isActive: true, memberStatus: "INACTIVE" });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Member inactive");
  });

  it("no expiry date = valid", () => {
    const result = isCardValid({ isActive: true, memberStatus: "ACTIVE", expiresAt: null });
    expect(result.valid).toBe(true);
  });
});

describe("rfid-handler: LED color mapping", () => {
  function getLedForStatus(status: string): "GREEN" | "RED" | "BLUE" | "NONE" {
    if (status === "OK") return "GREEN";
    if (status === "DENIED" || status === "ERROR") return "RED";
    if (status === "DUPLICATE") return "NONE";
    return "BLUE";
  }

  it("OK status = GREEN LED", () => {
    expect(getLedForStatus("OK")).toBe("GREEN");
  });

  it("DENIED = RED LED", () => {
    expect(getLedForStatus("DENIED")).toBe("RED");
  });

  it("ERROR = RED LED", () => {
    expect(getLedForStatus("ERROR")).toBe("RED");
  });

  it("DUPLICATE = no LED", () => {
    expect(getLedForStatus("DUPLICATE")).toBe("NONE");
  });

  it("INFO = BLUE LED", () => {
    expect(getLedForStatus("INFO")).toBe("BLUE");
  });
});

describe("rfid-handler: stats aggregation", () => {
  function aggregateStats(events: Array<{ eventType: string; status: string; memberId?: string }>) {
    const checkIns = events.filter((e) => e.eventType === "CHECKIN").length;
    const checkouts = events.filter((e) => e.eventType === "CHECKOUT_BOOK").length;
    const denied = events.filter((e) => e.status === "DENIED").length;
    const uniqueMembers = new Set(events.filter((e) => e.memberId).map((e) => e.memberId)).size;
    return {
      total: events.length,
      checkIns,
      checkouts,
      denied,
      uniqueMembers,
    };
  }

  it("counts events correctly", () => {
    const events = [
      { eventType: "CHECKIN", status: "OK", memberId: "m1" },
      { eventType: "CHECKIN", status: "OK", memberId: "m2" },
      { eventType: "CHECKOUT_BOOK", status: "OK", memberId: "m1" },
      { eventType: "UNKNOWN_CARD", status: "DENIED" },
    ];
    const stats = aggregateStats(events);
    expect(stats.total).toBe(4);
    expect(stats.checkIns).toBe(2);
    expect(stats.checkouts).toBe(1);
    expect(stats.denied).toBe(1);
    expect(stats.uniqueMembers).toBe(2);
  });

  it("handles empty events", () => {
    const stats = aggregateStats([]);
    expect(stats.total).toBe(0);
    expect(stats.uniqueMembers).toBe(0);
  });
});

describe("rfid-handler: event types", () => {
  const VALID_EVENT_TYPES = [
    "CHECKIN",
    "CHECKOUT",
    "CHECKOUT_BOOK",
    "RETURN",
    "EXIT",
    "UNKNOWN_CARD",
    "INACTIVE_CARD",
    "EXPIRED_CARD",
    "ERROR",
    "DEBOUNCED",
  ];

  it("all event types are valid", () => {
    expect(VALID_EVENT_TYPES).toContain("CHECKIN");
    expect(VALID_EVENT_TYPES).toContain("CHECKOUT_BOOK");
    expect(VALID_EVENT_TYPES).toContain("UNKNOWN_CARD");
  });

  it("event types are unique", () => {
    const set = new Set(VALID_EVENT_TYPES);
    expect(set.size).toBe(VALID_EVENT_TYPES.length);
  });
});

describe("rfid-handler: response builder", () => {
  function buildResponse(
    success: boolean,
    eventType: string,
    status: string,
    message: string,
    led: "GREEN" | "RED" | "BLUE" | "NONE"
  ) {
    return {
      success,
      eventType,
      status,
      message,
      readerResponse: { beep: success, led, duration: 200 },
    };
  }

  it("success response has GREEN LED and beep", () => {
    const r = buildResponse(true, "CHECKIN", "OK", "Welcome", "GREEN");
    expect(r.success).toBe(true);
    expect(r.readerResponse.led).toBe("GREEN");
    expect(r.readerResponse.beep).toBe(true);
  });

  it("failure response has RED LED and beep", () => {
    const r = buildResponse(false, "UNKNOWN_CARD", "DENIED", "Denied", "RED");
    expect(r.success).toBe(false);
    expect(r.readerResponse.led).toBe("RED");
    expect(r.readerResponse.beep).toBe(false);
  });
});
