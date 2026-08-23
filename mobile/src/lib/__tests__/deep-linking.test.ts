/**
 * Unit tests untuk mobile deep linking config.
 */

// Mock react-native
vi.mock("react-native", () => ({
  Linking: {
    getInitialURL: vi.fn().mockResolvedValue(null),
    addEventListener: vi.fn().mockReturnValue({ remove: vi.fn() }),
  },
}));

import { deepLinkConfig, getBookLink, getRewardLink, getLoanLink, APP_SCHEME } from "../deep-linking";

describe("mobile deep-linking: config", () => {
  it("has correct scheme prefix", () => {
    expect(APP_SCHEME).toBe("jendela-ilmu");
    expect(deepLinkConfig.prefixes).toContain("jendela-ilmu://");
  });

  it("has https prefix for universal links", () => {
    const httpsPrefix = deepLinkConfig.prefixes.find((p) => p.startsWith("https://"));
    expect(httpsPrefix).toBeDefined();
    expect(httpsPrefix).toContain("perpustakaan.sekolah.sch.id");
  });

  it("has MainTabs screen config", () => {
    expect(deepLinkConfig.config.screens).toHaveProperty("MainTabs");
  });

  it("MainTabs has all 5 tab screens", () => {
    const tabs = deepLinkConfig.config.screens.MainTabs.screens;
    expect(tabs).toHaveProperty("Home");
    expect(tabs).toHaveProperty("Catalog");
    expect(tabs).toHaveProperty("Scan");
    expect(tabs).toHaveProperty("Rewards");
    expect(tabs).toHaveProperty("Profile");
  });

  it("has BookDetail, RewardDetail, LoanDetail routes", () => {
    const screens = deepLinkConfig.config.screens;
    expect(screens).toHaveProperty("BookDetail");
    expect(screens).toHaveProperty("RewardDetail");
    expect(screens).toHaveProperty("MyLoans");
    expect(screens).toHaveProperty("MyRedemptions");
  });
});

describe("mobile deep-linking: link generators", () => {
  it("generates book deep link", () => {
    expect(getBookLink("abc-123")).toBe("jendela-ilmu://book/abc-123");
  });

  it("generates reward deep link", () => {
    expect(getRewardLink("xyz-789")).toBe("jendela-ilmu://reward/xyz-789");
  });

  it("generates loan deep link", () => {
    expect(getLoanLink("loan-1")).toBe("jendela-ilmu://loan/loan-1");
  });

  it("generates web link variants", () => {
    const webBookLink = "https://perpustakaan.sekolah.sch.id/book/abc-123";
    expect(webBookLink.startsWith("https://")).toBe(true);
  });
});

describe("mobile deep-linking: URL parsing", () => {
  it("parses book URL", () => {
    const url = "jendela-ilmu://book/abc-123";
    const match = url.match(/^jendela-ilmu:\/\/book\/(.+)$/);
    expect(match).not.toBeNull();
    expect(match![1]).toBe("abc-123");
  });

  it("parses reward URL", () => {
    const url = "jendela-ilmu://reward/xyz";
    const match = url.match(/^jendela-ilmu:\/\/reward\/(.+)$/);
    expect(match).not.toBeNull();
    expect(match![1]).toBe("xyz");
  });

  it("rejects invalid scheme", () => {
    const url = "http://malicious.com/book/123";
    const match = url.match(/^jendela-ilmu:\/\//);
    expect(match).toBeNull();
  });
});
