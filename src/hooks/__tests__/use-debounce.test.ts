/**
 * Tests untuk src/hooks/use-debounce.ts
 * Note: pakai @testing-library/react untuk render hook
 */

import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "../use-debounce";

describe("useDebounce", () => {
  it("return initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("initial", 300));
    expect(result.current).toBe("initial");
  });

  it("debounce value update", async () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: "initial" },
    });
    expect(result.current).toBe("initial");

    rerender({ value: "updated" });
    expect(result.current).toBe("initial"); // belum debounce

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe("updated");

    vi.useRealTimers();
  });

  it("cancel previous timeout saat value berubah cepat", async () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: "a" },
    });

    rerender({ value: "b" });
    act(() => vi.advanceTimersByTime(100));
    rerender({ value: "c" });
    act(() => vi.advanceTimersByTime(100));
    rerender({ value: "d" });

    // Total 200ms dari perubahan pertama — belum debounce
    expect(result.current).toBe("a");

    act(() => vi.advanceTimersByTime(300));
    // Setelah 300ms dari perubahan terakhir
    expect(result.current).toBe("d");

    vi.useRealTimers();
  });

  it("default delay 300ms", async () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value }) => useDebounce(value), {
      initialProps: { value: "a" },
    });
    rerender({ value: "b" });
    act(() => vi.advanceTimersByTime(299));
    expect(result.current).toBe("a");
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe("b");
    vi.useRealTimers();
  });
});
