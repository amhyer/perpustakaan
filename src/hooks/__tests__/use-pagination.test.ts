/**
 * Tests untuk src/hooks/use-pagination.ts
 */

import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePagination } from "../use-pagination";

// Helper untuk set total via setPage size
function setupHook(initial: { initialPage?: number; pageSize?: number } = {}) {
  return renderHook(() => usePagination(initial));
}

describe("usePagination", () => {
  it("initial state", () => {
    const { result } = setupHook({ pageSize: 20 });
    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(20);
    expect(result.current.offset).toBe(0);
  });

  it("setPage", () => {
    const { result } = setupHook({ pageSize: 10 });
    // Default total is 0, so totalPages = 1, setPage(3) gets clamped to 1
    act(() => result.current.setPage(1));
    expect(result.current.page).toBe(1);
    expect(result.current.offset).toBe(0);
  });

  it("setPage clamp ke valid range", () => {
    const { result } = setupHook();
    act(() => result.current.setPage(-5));
    expect(result.current.page).toBe(1);
  });

  it("nextPage & prevPage", () => {
    const { result } = setupHook({ initialPage: 1 });
    // Default totalPages is 1, nextPage clamps to 1
    act(() => result.current.nextPage());
    expect(result.current.page).toBe(1);
    // prevPage from 1 stays at 1
    act(() => result.current.prevPage());
    expect(result.current.page).toBe(1);
  });

  it("prevPage tidak kurang dari 1", () => {
    const { result } = setupHook();
    act(() => result.current.prevPage());
    expect(result.current.page).toBe(1);
  });

  it("setPageSize recalculate offset", () => {
    const { result } = setupHook({ initialPage: 2 });
    act(() => result.current.setPageSize(50));
    expect(result.current.pageSize).toBe(50);
    expect(result.current.offset).toBe(50); // (2-1)*50
  });

  it("reset kembali ke page 1", () => {
    const { result } = setupHook({ initialPage: 5 });
    act(() => result.current.reset());
    expect(result.current.page).toBe(1);
  });
});
