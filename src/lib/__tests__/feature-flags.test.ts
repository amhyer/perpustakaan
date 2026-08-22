/**
 * Tests untuk src/lib/feature-flags.ts
 */

import { describe, it, expect, beforeEach } from "vitest";
import { isFeatureEnabled, areFeaturesEnabled, invalidateFeatureFlagsCache } from "../feature-flags";

describe("feature flags", () => {
  beforeEach(() => {
    invalidateFeatureFlagsCache();
  });

  it("return true for enabled flag", async () => {
    const result = await isFeatureEnabled("whatsapp_broadcast_enabled");
    expect(result).toBe(true);
  });

  it("return false for disabled flag", async () => {
    const result = await isFeatureEnabled("experimental_ai_recommendation");
    expect(result).toBe(false);
  });

  it("return false for unknown flag", async () => {
    const result = await isFeatureEnabled("nonexistent_flag_xyz");
    expect(result).toBe(false);
  });

  it("respect role-based restrictions", async () => {
    // gamification_enabled hanya untuk STUDENT/TEACHER
    const student = await isFeatureEnabled("gamification_enabled", { role: "STUDENT" });
    const librarian = await isFeatureEnabled("gamification_enabled", { role: "LIBRARIAN" });
    expect(student).toBe(true);
    expect(librarian).toBe(false);
  });

  it("respect rollout percentage — deterministic per user", async () => {
    // new_dashboard_v2 enabled dengan 50% rollout
    const user1 = await isFeatureEnabled("new_dashboard_v2", { userId: "user-1" });
    const user2 = await isFeatureEnabled("new_dashboard_v2", { userId: "user-2" });
    // Same user selalu dapat hasil sama
    const user1Again = await isFeatureEnabled("new_dashboard_v2", { userId: "user-1" });
    expect(user1).toBe(user1Again);
    // Different user bisa beda (tidak selalu)
    expect(typeof user2).toBe("boolean");
  });

  it("100% rollout include everyone", async () => {
    // whatsapp_broadcast_enabled enabled tanpa rollout (default 100%)
    const result = await isFeatureEnabled("whatsapp_broadcast_enabled", { userId: "any-user" });
    expect(result).toBe(true);
  });

  it("areFeaturesEnabled — batch check", async () => {
    const result = await areFeaturesEnabled(
      ["whatsapp_broadcast_enabled", "experimental_ai_recommendation", "unknown_flag"],
      { role: "STUDENT" }
    );
    expect(result).toEqual({
      whatsapp_broadcast_enabled: true,
      experimental_ai_recommendation: false,
      unknown_flag: false,
    });
  });

  it("handle no context gracefully", async () => {
    // Role-based flag tanpa role → false
    const result = await isFeatureEnabled("gamification_enabled");
    expect(result).toBe(false);
  });
});
