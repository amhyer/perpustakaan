/**
 * Tests untuk src/hooks/use-local-storage.ts
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLocalStorage } from "../use-local-storage";

describe("useLocalStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("return initial value kalau localStorage kosong", () => {
    const { result } = renderHook(() => useLocalStorage("key1", "default"));
    expect(result.current[0]).toBe("default");
  });

  it("return stored value kalau ada", () => {
    window.localStorage.setItem("key1", JSON.stringify("stored"));
    const { result } = renderHook(() => useLocalStorage("key1", "default"));
    expect(result.current[0]).toBe("stored");
  });

  it("save ke localStorage saat value berubah", () => {
    const { result } = renderHook(() => useLocalStorage("key1", "a"));
    act(() => result.current[1]("b"));
    expect(window.localStorage.getItem("key1")).toBe(JSON.stringify("b"));
  });

  it("support function updater", () => {
    const { result } = renderHook(() => useLocalStorage<number>("count", 0));
    act(() => result.current[1]((prev) => prev + 1));
    expect(result.current[0]).toBe(1);
    act(() => result.current[1]((prev) => prev + 1));
    expect(result.current[0]).toBe(2);
  });

  it("handle object values", () => {
    const initial = { name: "Test", count: 0 };
    const { result } = renderHook(() => useLocalStorage("obj", initial));
    act(() => result.current[1]({ name: "Updated", count: 1 }));
    expect(result.current[0]).toEqual({ name: "Updated", count: 1 });
    expect(JSON.parse(window.localStorage.getItem("obj")!)).toEqual({
      name: "Updated",
      count: 1,
    });
  });

  it("handle invalid JSON gracefully", () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    window.localStorage.setItem("key1", "not-valid-json{");
    const { result } = renderHook(() => useLocalStorage("key1", "fallback"));
    expect(result.current[0]).toBe("fallback");
    consoleSpy.mockRestore();
  });

  it("handle array values", () => {
    const { result } = renderHook(() => useLocalStorage<number[]>("arr", [1, 2]));
    act(() => result.current[1]([...result.current[0], 3]));
    expect(result.current[0]).toEqual([1, 2, 3]);
  });
});
