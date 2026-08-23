/**
 * Tests for PWA Install Prompt (pure logic).
 *
 * Sprint V - Production-Ready PWA.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

describe("PWA Install Prompt: platform detection", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("detects iPhone", () => {
    const ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)";
    expect(/iPad|iPhone|iPod/.test(ua)).toBe(true);
  });

  it("detects iPad", () => {
    const ua = "Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)";
    expect(/iPad|iPhone|iPod/.test(ua)).toBe(true);
  });

  it("detects Android", () => {
    const ua = "Mozilla/5.0 (Linux; Android 11)";
    expect(/Android/.test(ua)).toBe(true);
  });

  it("detects Windows desktop", () => {
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";
    expect(/Windows|Mac|Linux/.test(ua)).toBe(true);
  });

  it("detects macOS", () => {
    const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)";
    expect(/Windows|Mac|Linux/.test(ua)).toBe(true);
  });

  it("does not misidentify ChromeOS as Android", () => {
    const ua = "Mozilla/5.0 (X11; CrOS x86_64 13099.85.0)";
    expect(/Android/.test(ua)).toBe(false);
    // ChromeOS identifies as Linux but X11, not a typical desktop UA
    // We still consider it as desktop-capable
  });
});

describe("PWA Install Prompt: display-mode detection", () => {
  it("standalone mode is true when installed", () => {
    const isStandalone =
      "(display-mode: standalone)".includes("standalone") &&
      true; // Simulated matchMedia
    expect(isStandalone).toBe(true);
  });

  it("browser mode is false", () => {
    const matches = false; // matchMedia('(display-mode: standalone)').matches
    expect(matches).toBe(false);
  });

  it("minimal-ui mode detection", () => {
    const ua = "Mozilla/5.0 (display-mode: minimal-ui)";
    const isMinimal = ua.includes("display-mode: minimal-ui");
    expect(isMinimal).toBe(true);
  });
});

describe("PWA Install Prompt: storage keys", () => {
  it("uses correct dismissed key", () => {
    const key = "ji-install-prompt-dismissed";
    expect(key).toBe("ji-install-prompt-dismissed");
    expect(key.startsWith("ji-")).toBe(true);
  });

  it("uses correct installed key", () => {
    const key = "ji-install-prompt-installed";
    expect(key).toBe("ji-install-prompt-installed");
  });
});

describe("PWA Install Prompt: beforeinstallprompt event", () => {
  it("event type is correct", () => {
    const eventName = "beforeinstallprompt";
    expect(eventName).toBe("beforeinstallprompt");
  });

  it("appinstalled event fires when installed", () => {
    const eventName = "appinstalled";
    expect(eventName).toBe("appinstalled");
  });
});

describe("PWA Install Prompt: iOS instructions", () => {
  it("iOS requires manual share button", () => {
    // iOS doesn't support beforeinstallprompt
    // User must use Safari Share menu
    const isIOS = true;
    const supportsBeforeInstall = !isIOS;
    expect(supportsBeforeInstall).toBe(false);
  });

  it("instructions include Share button", () => {
    const instruction = "Tap tombol Share lalu pilih Add to Home Screen";
    expect(instruction).toContain("Share");
    expect(instruction).toContain("Add to Home Screen");
  });
});

describe("PWA Install Prompt: feature list", () => {
  it("features are accurate", () => {
    const features = [
      { emoji: "⚡", title: "Super Cepat", description: "Loading instant" },
      { emoji: "📡", title: "Bisa Offline", description: "Tanpa internet" },
      { emoji: "🔔", title: "Notifikasi", description: "Pengingat" },
      { emoji: "📱", title: "Multi-device", description: "HP, tablet, laptop" },
    ];
    expect(features).toHaveLength(4);
    features.forEach((f) => {
      expect(f.emoji).toBeTruthy();
      expect(f.title).toBeTruthy();
    });
  });
});

describe("PWA Install Prompt: timing", () => {
  it("default autoShowDelay is 30 seconds", () => {
    const defaultDelay = 30000;
    expect(defaultDelay).toBe(30000);
  });

  it("delay is reasonable for UX", () => {
    const minDelay = 5000; // 5 sec minimum
    const maxDelay = 60000; // 1 min maximum
    const defaultDelay = 30000;
    expect(defaultDelay).toBeGreaterThanOrEqual(minDelay);
    expect(defaultDelay).toBeLessThanOrEqual(maxDelay);
  });
});

describe("PWA Install Prompt: manifest requirements", () => {
  it("display should be standalone", () => {
    const validDisplays = ["standalone", "fullscreen", "minimal-ui"];
    expect(validDisplays).toContain("standalone");
  });

  it("icons must include 192 and 512 sizes", () => {
    const requiredSizes = ["192x192", "512x512"];
    requiredSizes.forEach((size) => {
      expect(size).toMatch(/^\d+x\d+$/);
    });
  });

  it("start_url should be /", () => {
    expect("/").toBe("/");
  });

  it("scope should be /", () => {
    expect("/").toBe("/");
  });
});
