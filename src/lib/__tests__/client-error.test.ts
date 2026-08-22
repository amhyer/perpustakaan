/**
 * Unit tests untuk src/lib/client-error.ts
 * Test: reportClientError kirim POST dengan format yang benar
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { reportClientError } from "../client-error";

describe("reportClientError", () => {
  let fetchMock: any;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("kirim POST ke /api/error-log/client", async () => {
    const err = new Error("Test error");
    await reportClientError(err);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/error-log/client");
    expect(options.method).toBe("POST");
  });

  it("body berisi message, stack, dan context", async () => {
    const err = new Error("Boom!");
    await reportClientError(err, { component: "TestComp", userId: "u1" });
    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.message).toBe("Boom!");
    expect(body.stack).toBeDefined();
    expect(body.context.component).toBe("TestComp");
    expect(body.context.userId).toBe("u1");
  });

  it("tidak throw saat fetch gagal", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network down"));
    const err = new Error("Test");
    await expect(reportClientError(err)).resolves.toBeUndefined();
  });

  it("tidak throw saat network error", async () => {
    global.fetch = vi.fn().mockImplementation(() => {
      throw new Error("Connection refused");
    });
    const err = new Error("Test");
    await expect(reportClientError(err)).resolves.toBeUndefined();
  });

  it("Content-Type: application/json", async () => {
    await reportClientError(new Error("x"));
    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers["Content-Type"]).toBe("application/json");
  });
});
