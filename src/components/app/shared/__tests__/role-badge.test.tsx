/**
 * Unit tests untuk RoleBadge.
 *
 * Pure presentational component — tidak butuh mock store.
 * Test rendering, accessibility, dan visual variant per role.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RoleBadge } from "../role-badge";
import type { CurrentUser } from "@/lib/api-client";

function makeUser(role: CurrentUser["role"]): CurrentUser {
  return {
    id: "u1",
    email: "test@example.com",
    name: "Test",
    role,
    member: null,
    defaultDashboard: "default",
  };
}

describe("RoleBadge", () => {
  it("returns null when user is null", () => {
    const { container } = render(<RoleBadge user={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders LIBRARIAN with correct label", () => {
    render(<RoleBadge user={makeUser("LIBRARIAN")} />);
    expect(screen.getByText("Pustakawan")).toBeInTheDocument();
  });

  it("renders PUSTAKAWAN_JUNIOR with correct label", () => {
    render(<RoleBadge user={makeUser("PUSTAKAWAN_JUNIOR")} />);
    expect(screen.getByText("Pustakawan Junior")).toBeInTheDocument();
  });

  it("renders TEACHER with correct label", () => {
    render(<RoleBadge user={makeUser("TEACHER")} />);
    expect(screen.getByText("Guru")).toBeInTheDocument();
  });

  it("renders STUDENT with correct label", () => {
    render(<RoleBadge user={makeUser("STUDENT")} />);
    expect(screen.getByText("Siswa")).toBeInTheDocument();
  });

  it("has role='status' for screen reader announcement", () => {
    render(<RoleBadge user={makeUser("LIBRARIAN")} />);
    const badge = screen.getByRole("status");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute("aria-label", "Tipe akun: Pustakawan");
  });

  it("hides icon from screen reader", () => {
    const { container } = render(<RoleBadge user={makeUser("TEACHER")} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("does not show icon when showIcon=false", () => {
    const { container } = render(
      <RoleBadge user={makeUser("STUDENT")} showIcon={false} />
    );
    // Icon tidak dirender sama sekali
    expect(container.querySelector("svg")).toBeNull();
  });

  it("applies className override", () => {
    const { container } = render(
      <RoleBadge user={makeUser("LIBRARIAN")} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("applies different color per role", () => {
    const { container: lib } = render(<RoleBadge user={makeUser("LIBRARIAN")} />);
    const { container: teacher } = render(<RoleBadge user={makeUser("TEACHER")} />);
    const { container: student } = render(<RoleBadge user={makeUser("STUDENT")} />);

    // Pustakawan pakai primary, Guru amber, Siswa sky
    expect(lib.firstChild).toHaveClass("text-primary");
    expect(teacher.firstChild).toHaveClass("text-amber-700");
    expect(student.firstChild).toHaveClass("text-sky-700");
  });
});
