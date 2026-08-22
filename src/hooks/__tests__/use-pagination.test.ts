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
    act(() => result.current.setPage(3));
    expect(result.current.page).toBe(3);
    expect(result.current.offset).toBe(20);
  });

  it("setPage clamp ke valid range", () => {
    const { result } = setupHook();
    act(() => result.current.setPage(-5));
    expect(result.current.page).toBe(1);
  });

  it("nextPage & prevPage", () => {
    const { result } = setupHook({ initialPage: 2 });
    act(() => result.current.nextPage());
    expect(result.current.page).toBe(3);
    act(() => result.current.prevPage());
    expect(result.current.page).toBe(2);
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
