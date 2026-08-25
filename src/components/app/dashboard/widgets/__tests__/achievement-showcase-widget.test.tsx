/**
 * Tests for AchievementShowcaseWidget.
 *
 * Sprint U - Final UI integration.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock api
const mockGet = vi.fn();
vi.mock("@/lib/api-client", () => ({
  api: { get: (...args: any[]) => mockGet(...args) },
}));

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
    mockGet.mockResolvedValue(null);
  });

  it("renders widget with title", async () => {
    render(<AchievementShowcaseWidget />);

    await waitFor(() => {
      expect(screen.getByText(/Pencapaian/i)).toBeTruthy();
    });
  });

  it("shows quick stats in overview tab", async () => {
    mockGet.mockResolvedValue({
      name: "Kutu Buku",
      emoji: "📚",
      color: "emerald",
      booksRead: 23,
    });

    render(<AchievementShowcaseWidget />);

    await waitFor(() => {
      expect(screen.getByText("23")).toBeTruthy(); // books read
    });
  });

  it("switches tabs on click", async () => {
    mockGet.mockResolvedValue({
      name: "Kutu Buku",
      emoji: "📚",
      color: "emerald",
      booksRead: 23,
    });

    render(<AchievementShowcaseWidget />);

    await waitFor(() => {
      expect(screen.getByText("Overview")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Streak" }));
    await waitFor(() => {
      expect(screen.getByText(/Hari Saat Ini/i)).toBeTruthy();
    });
  });

  it("displays all 5 tabs", async () => {
    mockGet.mockResolvedValue({});

    render(<AchievementShowcaseWidget />);

    await waitFor(() => {
      ["Overview", "Level", "Streak", "Badge", "Tantangan"].forEach((tab) => {
        expect(screen.getByRole("button", { name: tab })).toBeTruthy();
      });
    });
  });
});
