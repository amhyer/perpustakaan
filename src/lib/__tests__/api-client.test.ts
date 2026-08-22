/**
 * Unit tests untuk src/lib/api-client.ts
 * Test: request helper (GET/POST/PUT/DELETE), error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api } from "../api-client";

describe("api client", () => {
  let fetchMock: any;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("api.get", () => {
    it("kirim GET request", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: "1", name: "Test" }),
      });
      const result = await api.get<{ id: string; name: string }>("/api/test");
      expect(result).toEqual({ id: "1", name: "Test" });
      expect(fetchMock.mock.calls[0][0]).toBe("/api/test");
    });
  });

  describe("api.post", () => {
    it("kirim POST dengan body JSON", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ success: true }),
      });
      const result = await api.post("/api/test", { name: "X" });
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/test");
      expect(options.method).toBe("POST");
      expect(options.body).toBe(JSON.stringify({ name: "X" }));
      expect(options.headers["Content-Type"]).toBe("application/json");
    });

    it("handle POST tanpa body", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 204,
        json: async () => undefined,
      });
      await api.post("/api/test");
      const [, options] = fetchMock.mock.calls[0];
      expect(options.body).toBeUndefined();
    });
  });

  describe("api.put", () => {
    it("kirim PUT dengan body", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ updated: true }),
      });
      await api.put("/api/test", { name: "Updated" });
      const [, options] = fetchMock.mock.calls[0];
      expect(options.method).toBe("PUT");
      expect(options.body).toBe(JSON.stringify({ name: "Updated" }));
    });
  });

  describe("api.delete", () => {
    it("kirim DELETE tanpa body", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 204,
        json: async () => undefined,
      });
      await api.delete("/api/test");
      const [, options] = fetchMock.mock.calls[0];
      expect(options.method).toBe("DELETE");
    });
  });

  describe("error handling", () => {
    it("throw Error dengan message dari server", async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: "Data tidak valid" }),
      });
      await expect(api.post("/api/test", {})).rejects.toThrow("Data tidak valid");
    });

    it("fallback ke status code jika server tidak return error", async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error("not json");
        },
      });
      await expect(api.get("/api/test")).rejects.toThrow("Request gagal (500)");
    });

    it("handle response 204 No Content", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 204,
        json: async () => {
          throw new Error("no body");
        },
      });
      const result = await api.delete("/api/test");
      expect(result).toBeUndefined();
    });

    it("prioritas: error > message", async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: "Error wins", message: "Message loses" }),
      });
      await expect(api.get("/api/test")).rejects.toThrow("Error wins");
    });
  });
});
