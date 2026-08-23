/**
 * Tests for AchievementShowcaseWidget.
 *
 * Sprint U - Final UI integration.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock fetch
const mockFetch = vi.fn();
(global as any).fetch = mockFetch;

// Mock useAppStore
const mockStore = {
  user: { id: "u1", role: "STUDENT", member: { id: "m1" } },
  view: "dashboard",
  setView: vi.fn(),
  commandPaletteOpen: false,
  setCommandPaletteOpen: vi.fn(),
  toggleCommandPalette: vi.fn(),
  recentItems: [],
  trackRecent: vi.fn(),
  clearRecent: vi.fn(),
  triggerRefresh: vi.fn(),
};
vi.mock("@/store/use-app-store", () => ({
  useAppStore: () => mockStore,
}));

vi.mock("@/hooks/use-keyboard-shortcut", () => ({
  useKeyboardShortcut: vi.fn(),
}));

import { AchievementShowcaseWidget } from "../achievement-showcase-widget";

describe("AchievementShowcaseWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders widget with title", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        level: { name: "Kutu Buku", emoji: "📚", color: "emerald", booksRead: 23 },
        currentStreak: 5, longestStreak: 12,
      }),
    });

    render(<AchievementShowcaseWidget />);

    await waitFor(() => {
      expect(screen.getByText(/Pencapaian/i)).toBeTruthy();
    });
  });

  it("shows quick stats in overview tab", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        level: { name: "Kutu Buku", emoji: "📚", color: "emerald", booksRead: 23 },
        currentStreak: 5, longestStreak: 12,
      }),
    });

    render(<AchievementShowcaseWidget />);

    await waitFor(() => {
      expect(screen.getByText("23")).toBeTruthy(); // books read
      expect(screen.getByText("5")).toBeTruthy(); // streak
    });
  });

  it("switches tabs on click", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        level: { name: "Kutu Buku", emoji: "📚", color: "emerald", booksRead: 23 },
        currentStreak: 5, longestStreak: 12,
      }),
    });

    render(<AchievementShowcaseWidget />);

    await waitFor(() => {
      expect(screen.getByText("Overview")).toBeTruthy();
    });

    fireEvent.click(screen.getByText("Streak"));
    await waitFor(() => {
      expect(screen.getByText(/Streak Saat Ini/i)).toBeTruthy();
    });
  });

  it("displays all 5 tabs", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    render(<AchievementShowcaseWidget />);

    await waitFor(() => {
      ["Overview", "Level", "Streak", "Badge", "Tantangan"].forEach((tab) => {
        expect(screen.getByText(tab)).toBeTruthy();
      });
    });
  });
});
