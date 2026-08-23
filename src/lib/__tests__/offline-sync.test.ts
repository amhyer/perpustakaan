/**
 * Tests for offline sync queue.
 *
 * Sprint P - Tier 3 #9: PWA Offline Mode.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

const mockStorage: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => mockStorage[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockStorage[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockStorage[key];
  }),
  clear: vi.fn(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  }),
};
(global as any).localStorage = localStorageMock;
(global as any).window = { localStorage: localStorageMock };
(global as any).navigator = { onLine: true };

vi.mock("../logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  enqueueOperation,
  getQueue,
  dequeueOperation,
  getQueueStats,
  clearQueue,
  clearFailed,
  syncQueue,
  isOnline,
  describeOperation,
  isOfflineSupported,
  getStatusColor,
  type QueuedOperation,
} from "../offline-sync";

describe("offline-sync: queue management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  });

  describe("enqueueOperation", () => {
    it("adds operation to queue", () => {
      const op = enqueueOperation("LOAN_CREATE", { bookId: "b1" });
      expect(op.id).toMatch(/^local-/);
      expect(op.status).toBe("PENDING");
      expect(op.type).toBe("LOAN_CREATE");
      expect(getQueue()).toHaveLength(1);
    });

    it("assigns timestamp to operation", () => {
      const op = enqueueOperation("REVIEW_CREATE", { rating: 5 });
      expect(op.createdAt).toBeLessThanOrEqual(Date.now());
      expect(op.createdAt).toBeGreaterThan(Date.now() - 1000);
    });

    it("preserves order (FIFO)", () => {
      enqueueOperation("LOAN_CREATE", { bookId: "b1" });
      enqueueOperation("LOAN_RETURN", { loanId: "l1" });
      enqueueOperation("REVIEW_CREATE", { rating: 5 });
      const queue = getQueue();
      expect(queue[0].type).toBe("LOAN_CREATE");
      expect(queue[1].type).toBe("LOAN_RETURN");
      expect(queue[2].type).toBe("REVIEW_CREATE");
    });

    it("trims queue to MAX_QUEUE_SIZE", () => {
      for (let i = 0; i < 105; i++) {
        enqueueOperation("LOAN_CREATE", { idx: i });
      }
      expect(getQueue().length).toBe(100);
      // First 5 (oldest) are dropped
      expect(getQueue()[0].payload.idx).toBe(5);
    });
  });

  describe("dequeueOperation", () => {
    it("removes operation by id", () => {
      const op = enqueueOperation("LOAN_CREATE", { x: 1 });
      dequeueOperation(op.id);
      expect(getQueue()).toHaveLength(0);
    });

    it("is no-op for missing id", () => {
      enqueueOperation("LOAN_CREATE", {});
      dequeueOperation("nonexistent");
      expect(getQueue()).toHaveLength(1);
    });
  });

  describe("getQueueStats", () => {
    it("returns correct counts", () => {
      enqueueOperation("LOAN_CREATE", {});
      enqueueOperation("LOAN_CREATE", {});
      enqueueOperation("LOAN_RETURN", {});
      const stats = getQueueStats();
      expect(stats.total).toBe(3);
      expect(stats.pending).toBe(3);
      expect(stats.syncing).toBe(0);
      expect(stats.failed).toBe(0);
    });

    it("returns oldest pending age", async () => {
      enqueueOperation("LOAN_CREATE", {});
      await new Promise((r) => setTimeout(r, 50));
      const stats = getQueueStats();
      expect(stats.oldestPendingAge).toBeGreaterThanOrEqual(50);
    });

    it("returns null age for empty queue", () => {
      const stats = getQueueStats();
      expect(stats.oldestPendingAge).toBeNull();
    });
  });

  describe("clearQueue", () => {
    it("clears all operations", () => {
      enqueueOperation("LOAN_CREATE", {});
      enqueueOperation("LOAN_RETURN", {});
      clearQueue();
      expect(getQueue()).toHaveLength(0);
    });
  });

  describe("clearFailed", () => {
    it("removes only failed operations", () => {
      const op1 = enqueueOperation("LOAN_CREATE", {});
      const op2 = enqueueOperation("LOAN_RETURN", {});
      // Manually mark op1 as FAILED via storage update
      const queue = getQueue();
      queue[0].status = "FAILED";
      mockStorage["ji-offline-queue"] = JSON.stringify(queue);

      const removed = clearFailed();
      expect(removed).toBe(1);
      const remaining = getQueue();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(op2.id);
    });
  });
});

describe("offline-sync: syncQueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  });

  it("does nothing if queue empty", async () => {
    const result = await syncQueue(async () => ({ success: true }));
    expect(result.total).toBe(0);
    expect(result.successful).toBe(0);
  });

  it("processes all pending operations", async () => {
    enqueueOperation("LOAN_CREATE", { bookId: "b1" });
    enqueueOperation("LOAN_RETURN", { loanId: "l1" });

    const result = await syncQueue(async () => ({ success: true, serverId: "server-1" }));
    expect(result.total).toBe(2);
    expect(result.successful).toBe(2);
    expect(result.failed).toBe(0);
    // Queue should be cleared after success
    expect(getQueue()).toHaveLength(0);
  });

  it("marks failed operations as PENDING for retry (< max attempts)", async () => {
    enqueueOperation("LOAN_CREATE", { bookId: "b1" });

    const result = await syncQueue(async () => ({ success: false, error: "Network error" }));
    expect(result.failed).toBe(1);
    const op = getQueue()[0];
    expect(op.status).toBe("PENDING"); // Will retry
    expect(op.attempts).toBe(1);
    expect(op.errorMessage).toBe("Network error");
  });

  it("marks as FAILED after max attempts", async () => {
    enqueueOperation("LOAN_CREATE", { bookId: "b1" });

    // Simulate 5 failed attempts
    for (let i = 0; i < 5; i++) {
      await syncQueue(async () => ({ success: false, error: "err" }));
    }

    const op = getQueue()[0];
    expect(op.status).toBe("FAILED");
    expect(op.attempts).toBe(5);
  });

  it("records errors in result", async () => {
    enqueueOperation("LOAN_CREATE", { bookId: "b1" });
    const result = await syncQueue(async () => ({ success: false, error: "Bad request" }));
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toBe("Bad request");
  });

  it("tracks duration", async () => {
    enqueueOperation("LOAN_CREATE", { bookId: "b1" });
    const result = await syncQueue(async () => {
      await new Promise((r) => setTimeout(r, 30));
      return { success: true };
    });
    expect(result.durationMs).toBeGreaterThanOrEqual(30);
  });

  it("uses default sender (fetch) when no sender provided", async () => {
    enqueueOperation("LOAN_CREATE", { bookId: "b1" });
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, id: "srv-1" }),
    });
    (global as any).fetch = mockFetch;

    const result = await syncQueue();
    expect(mockFetch).toHaveBeenCalled();
    expect(result.successful).toBe(1);
  });

  it("default sender handles fetch errors", async () => {
    enqueueOperation("LOAN_CREATE", { bookId: "b1" });
    (global as any).fetch = vi.fn().mockRejectedValue(new Error("Network unreachable"));

    const result = await syncQueue();
    expect(result.failed).toBe(1);
    expect(result.errors[0].error).toContain("Network unreachable");
  });
});

describe("offline-sync: helpers", () => {
  describe("isOnline", () => {
    it("returns true when navigator.onLine is true", () => {
      (global as any).navigator.onLine = true;
      expect(isOnline()).toBe(true);
    });

    it("returns false when navigator.onLine is false", () => {
      (global as any).navigator.onLine = false;
      expect(isOnline()).toBe(false);
    });
  });

  describe("describeOperation", () => {
    it("returns Indonesian labels", () => {
      expect(describeOperation("LOAN_CREATE")).toBe("Peminjaman buku");
      expect(describeOperation("LOAN_RETURN")).toBe("Pengembalian buku");
      expect(describeOperation("REVIEW_CREATE")).toBe("Ulasan buku");
    });
  });

  describe("isOfflineSupported", () => {
    it("returns true for all current types", () => {
      expect(isOfflineSupported("LOAN_CREATE")).toBe(true);
      expect(isOfflineSupported("REVIEW_CREATE")).toBe(true);
      expect(isOfflineSupported("WISHLIST_ADD")).toBe(true);
    });
  });

  describe("getStatusColor", () => {
    it("maps statuses to colors", () => {
      expect(getStatusColor("PENDING")).toBe("outline");
      expect(getStatusColor("SYNCING")).toBe("secondary");
      expect(getStatusColor("FAILED")).toBe("destructive");
    });
  });
});
