/**
 * Unit tests untuk toast helpers.
 *
 * Sprint I - Accessibility & Mobile-First UX.
 *
 * Tests pure logic (variant configs, message builders).
 * Skips sonner rendering (would need @testing-library setup).
 */

import { describe, it, expect, vi } from "vitest";

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    custom: vi.fn().mockReturnValue("toast-id"),
    promise: vi.fn().mockImplementation((p) => ({
      unwrap: () => p,
    })),
    dismiss: vi.fn(),
    success: vi.fn().mockReturnValue("toast-id"),
    error: vi.fn().mockReturnValue("toast-id"),
    info: vi.fn().mockReturnValue("toast-id"),
    warning: vi.fn().mockReturnValue("toast-id"),
  },
}));

import { toast, crud } from "../toast-helpers";

describe("toast-helpers: simple variants", () => {
  it("success returns id", () => {
    const id = toast.success("Saved!");
    expect(id).toBeDefined();
  });

  it("error returns id", () => {
    const id = toast.error("Failed");
    expect(id).toBeDefined();
  });

  it("info returns id", () => {
    const id = toast.info("Heads up");
    expect(id).toBeDefined();
  });

  it("warning returns id", () => {
    const id = toast.warning("Watch out");
    expect(id).toBeDefined();
  });
});

describe("toast-helpers: dismiss", () => {
  it("dismisses specific id", () => {
    toast.dismiss("toast-1");
    // Just verify no error
  });

  it("dismisses all when no id", () => {
    toast.dismiss();
  });
});

describe("toast-helpers: promise", () => {
  it("wraps promise with messages", async () => {
    const result = await toast.promise(
      Promise.resolve("data"),
      {
        loading: "Loading...",
        success: "Done!",
        error: "Failed",
      }
    );
    expect(result).toBe("data");
  });

  it("supports function messages", async () => {
    const result = await toast.promise(
      Promise.resolve({ count: 5 }),
      {
        loading: "Loading...",
        success: (data) => `Loaded ${data.count} items`,
        error: (err) => `Error: ${err.message}`,
      }
    );
    expect(result.count).toBe(5);
  });

  it("rejects on error", async () => {
    await expect(
      toast.promise(Promise.reject(new Error("Test")), {
        loading: "Loading...",
        success: "Done",
        error: (err) => `Error: ${err.message}`,
      })
    ).rejects.toThrow("Test");
  });
});

describe("toast-helpers: loading", () => {
  it("returns id for manual dismiss", () => {
    const id = toast.loading("Saving...");
    expect(id).toBeDefined();
  });
});

describe("toast-helpers: CRUD shortcuts", () => {
  it("crud.created", () => {
    crud.created("Buku");
    // No assertion needed, just verify no error
  });

  it("crud.created with default", () => {
    crud.created();
  });

  it("crud.updated", () => {
    crud.updated("Anggota");
  });

  it("crud.deleted without undo", () => {
    crud.deleted("Buku");
  });

  it("crud.deleted with undo callback", () => {
    let undoCalled = false;
    crud.deleted("Buku", () => {
      undoCalled = true;
    });
    // Undo would be triggered by user click, not auto-called
    // The callback is wired but not called automatically
    // Wait for 6s timeout in real scenario
  });

  it("crud.saved", () => {
    crud.saved();
  });

  it("crud.copied", () => {
    crud.copied("Link");
  });

  it("crud.uploaded", () => {
    crud.uploaded("Foto");
  });

  it("crud.sent", () => {
    crud.sent("Pesan");
  });

  it("crud.failed with retry", () => {
    crud.failed("Simpan", () => {});
  });

  it("crud.failed without retry", () => {
    crud.failed("Simpan");
  });
});

describe("toast-helpers: undo", () => {
  it("shows toast with undo action", () => {
    const id = toast.undo({
      title: "Item deleted",
      description: "Click Undo to restore",
      onUndo: () => {},
    });
    expect(id).toBeDefined();
  });

  it("async onUndo supported", () => {
    const id = toast.undo({
      title: "Item deleted",
      onUndo: async () => {
        await Promise.resolve();
      },
    });
    expect(id).toBeDefined();
  });
});
