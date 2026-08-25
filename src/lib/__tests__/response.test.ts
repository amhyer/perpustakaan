/**
 * Tests untuk src/lib/response.ts
 */

import { describe, it, expect } from "vitest";
import { ok, err, ApiError } from "../response";

describe("ok", () => {
  it("return JSON response dengan status 200", async () => {
    const res = ok({ data: { id: 1 } });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/json");
    expect(await res.json()).toEqual({ id: 1 });
  });

  it("custom status", async () => {
    const res = ok({ data: {}, status: 201 });
    expect(res.status).toBe(201);
  });

  it("include security headers", () => {
    const res = ok({ data: {} });
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("custom headers", () => {
    const res = ok({ data: {}, headers: { "X-Custom": "value" } });
    expect(res.headers.get("X-Custom")).toBe("value");
  });
});

describe("err", () => {
  it("default status 500", async () => {
    const res = err({ error: "Oops" });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Oops" });
  });

  it("custom status & details", async () => {
    const res = err({ error: "Bad", status: 400, details: { field: "email" } });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Bad", details: { field: "email" } });
  });
});

describe("ApiError shortcuts", () => {
  it("badRequest", async () => {
    const res = ApiError.badRequest("Invalid");
    expect(res.status).toBe(400);
  });

  it("unauthorized default message", async () => {
    const res = ApiError.unauthorized();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("forbidden", async () => {
    const res = ApiError.forbidden();
    expect(res.status).toBe(403);
  });

  it("notFound", async () => {
    const res = ApiError.notFound();
    expect(res.status).toBe(404);
  });

  it("conflict", async () => {
    const res = ApiError.conflict("Duplicate", { id: 1 });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "Duplicate", details: { id: 1 } });
  });

  it("tooManyRequests dengan Retry-After", () => {
    const res = ApiError.tooManyRequests("Slow down", 60);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
  });

  it("serverError", async () => {
    const res = ApiError.serverError();
    expect(res.status).toBe(500);
  });

  it("serviceUnavailable", async () => {
    const res = ApiError.serviceUnavailable("DB down");
    expect(res.status).toBe(503);
  });
});
