/**
 * Tests untuk src/lib/event-bus.ts
 */

import { describe, it, expect, beforeEach } from "vitest";
import { eventBus, EVENTS } from "@/lib/event-bus";

describe("EventBus", () => {
  beforeEach(() => {
    // Cleanup by unsubscribing all — we'd need to track subs
    // For test, just use unique userIds
  });

  it("subscribe & publish ke user", () => {
    let received: any = null;
    eventBus.subscribe("user-1", (data) => {
      received = data;
    });

    eventBus.publish("user-1", EVENTS.NOTIFICATION_NEW, { title: "Test" });

    expect(received).toBeTruthy();
    expect(received.event).toBe(EVENTS.NOTIFICATION_NEW);
    expect(received.data.title).toBe("Test");
  });

  it("subscribe ke user lain tidak menerima event", () => {
    let receivedA: any = null;
    let receivedB: any = null;
    eventBus.subscribe("user-A", () => {
      receivedA = "yes";
    });
    eventBus.subscribe("user-B", () => {
      receivedB = "yes";
    });

    eventBus.publish("user-A", EVENTS.LOAN_CREATED, { loanId: "1" });

    expect(receivedA).toBeTruthy();
    expect(receivedB).toBeNull();
  });

  it("broadcast menerima semua subscriber", () => {
    let count = 0;
    eventBus.subscribe("user-1", () => count++);
    eventBus.subscribe("user-2", () => count++);
    eventBus.subscribe("user-3", () => count++);

    eventBus.broadcast(EVENTS.ANNOUNCEMENT_NEW, { title: "Global" });

    expect(count).toBe(3);
  });

  it("unsubscribe berhenti menerima events", () => {
    let count = 0;
    const subId = eventBus.subscribe("user-1", () => count++);

    eventBus.publish("user-1", EVENTS.LOAN_CREATED, {});
    expect(count).toBe(1);

    eventBus.unsubscribe(subId);

    eventBus.publish("user-1", EVENTS.LOAN_CREATED, {});
    expect(count).toBe(1); // Tidak increment lagi
  });

  it("handle error di subscriber tanpa break yang lain", () => {
    let secondReceived = false;
    eventBus.subscribe("user-1", () => {
      throw new Error("Subscriber error");
    });
    eventBus.subscribe("user-1", () => {
      secondReceived = true;
    });

    // Should not throw
    expect(() => {
      eventBus.publish("user-1", EVENTS.LOAN_CREATED, {});
    }).not.toThrow();

    expect(secondReceived).toBe(true);
  });

  it("event log terbatas max 100 entries", () => {
    // Publish > 100 events
    for (let i = 0; i < 150; i++) {
      eventBus.broadcast("test-event", { i });
    }
    const stats = eventBus.stats();
    expect(stats.recentEvents.length).toBeLessThanOrEqual(10);
  });

  it("stats menghitung active subscriptions", () => {
    const before = eventBus.stats().activeSubscriptions;
    const sub = eventBus.subscribe("user-test", () => {});
    const after = eventBus.stats().activeSubscriptions;
    expect(after).toBe(before + 1);
    eventBus.unsubscribe(sub);
    expect(eventBus.stats().activeSubscriptions).toBe(before);
  });
});
