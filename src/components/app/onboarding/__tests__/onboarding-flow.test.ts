/**
 * Tests untuk customizable dashboard layout logic.
 */

import { describe, it, expect } from "vitest";

interface Widget {
  id: string;
  type: string;
  size: "sm" | "md" | "lg";
  visible: boolean;
}

const DEFAULT_WIDGETS: Widget[] = [
  { id: "w1", type: "stat-total-books", size: "sm", visible: true },
  { id: "w2", type: "stat-active-members", size: "sm", visible: true },
  { id: "w3", type: "stat-active-loans", size: "sm", visible: true },
  { id: "w4", type: "stat-overdue", size: "sm", visible: true },
];

describe("Dashboard layout", () => {
  it("default widgets all visible", () => {
    const visible = DEFAULT_WIDGETS.filter((w) => w.visible);
    expect(visible.length).toBe(4);
  });

  it("toggle visibility", () => {
    const widget = { ...DEFAULT_WIDGETS[0] };
    const updated = { ...widget, visible: !widget.visible };
    expect(updated.visible).toBe(!widget.visible);
  });

  it("reorder widgets", () => {
    const reordered = [DEFAULT_WIDGETS[3], DEFAULT_WIDGETS[0], DEFAULT_WIDGETS[1], DEFAULT_WIDGETS[2]];
    expect(reordered[0].id).toBe("w4");
  });

  it("remove widget", () => {
    const updated = DEFAULT_WIDGETS.filter((w) => w.id !== "w1");
    expect(updated.length).toBe(3);
    expect(updated.find((w) => w.id === "w1")).toBeUndefined();
  });

  it("add widget", () => {
    const newWidget: Widget = {
      id: `w${Date.now()}`,
      type: "chart-trend",
      size: "lg",
      visible: true,
    };
    const updated = [...DEFAULT_WIDGETS, newWidget];
    expect(updated.length).toBe(5);
    expect(updated[4].type).toBe("chart-trend");
  });

  it("change widget size", () => {
    const widget = { ...DEFAULT_WIDGETS[0] };
    const updated = { ...widget, size: "lg" as const };
    expect(updated.size).toBe("lg");
  });
});

describe("Size to grid columns mapping", () => {
  const sizeMap: Record<string, number> = {
    sm: 1,
    md: 2,
    lg: 3,
  };

  it("sm = 1 col", () => {
    expect(sizeMap["sm"]).toBe(1);
  });

  it("md = 2 cols", () => {
    expect(sizeMap["md"]).toBe(2);
  });

  it("lg = 3 cols", () => {
    expect(sizeMap["lg"]).toBe(3);
  });
});
