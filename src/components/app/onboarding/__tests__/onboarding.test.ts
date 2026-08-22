/**
 * Tests untuk onboarding state management.
 */

import { describe, it, expect, beforeEach } from "vitest";

const STORAGE_KEY = "onboarding:completed";
const STORAGE_KEY_STEP = "onboarding:step";

describe("Onboarding state", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("initial state: not completed", () => {
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY_STEP)).toBeNull();
  });

  it("save step progress", () => {
    localStorage.setItem(STORAGE_KEY_STEP, "3");
    expect(localStorage.getItem(STORAGE_KEY_STEP)).toBe("3");
  });

  it("mark completed", () => {
    localStorage.setItem(STORAGE_KEY, "true");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("true");
  });

  it("reset clears all", () => {
    localStorage.setItem(STORAGE_KEY, "true");
    localStorage.setItem(STORAGE_KEY_STEP, "5");
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY_STEP);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY_STEP)).toBeNull();
  });
});
