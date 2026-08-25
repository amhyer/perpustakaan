/**
 * Accessibility audit untuk komponen Sprint 1-4.
 *
 * Cek konsistensi pattern a11y yang dipakai:
 * - aria-label untuk icon-only buttons
 * - aria-hidden untuk decorative icons
 * - role="status" untuk empty states
 * - heading hierarchy
 *
 * Pure test — tidak render komponen penuh, hanya validasi pattern
 * via grep. Lebih ringan dari RTL test.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const SHARED_DIR = join(__dirname, "..");
const WIDGETS_DIR = join(__dirname, "../../dashboard/widgets");

function readFile(filename: string, baseDir: string = SHARED_DIR): string {
  return readFileSync(join(baseDir, filename), "utf-8");
}

describe("Accessibility — pattern consistency", () => {
  describe("RoleBadge", () => {
    const content = readFile("role-badge.tsx");

    it("has role='status' on Badge", () => {
      expect(content).toMatch(/role="status"/);
    });

    it("has aria-label with role context", () => {
      expect(content).toMatch(/aria-label.*Tipe akun/);
    });

    it("hides decorative icon from screen reader", () => {
      expect(content).toMatch(/aria-hidden="true"/);
    });
  });

  describe("SetAsHomeButton", () => {
    const content = readFile("set-as-home-button.tsx");

    it("hides decorative icons (Home, Check, Loader2)", () => {
      const iconCount = (content.match(/aria-hidden="true"/g) ?? []).length;
      expect(iconCount).toBeGreaterThanOrEqual(2);
    });

    it("uses aria-busy for loading state", () => {
      expect(content).toMatch(/aria-busy/);
    });

    it("provides aria-label for default state", () => {
      expect(content).toMatch(/aria-label.*beranda/);
    });
  });

  describe("DefaultDashboardSelector", () => {
    const content = readFile("default-dashboard-selector.tsx");

    it("uses role='radiogroup' for option group", () => {
      expect(content).toMatch(/role="radiogroup"/);
    });

    it("uses role='radio' for each option", () => {
      expect(content).toMatch(/role="radio"/);
    });

    it("uses aria-checked to indicate selected option", () => {
      expect(content).toMatch(/aria-checked/);
    });

    it("provides aria-label for each option", () => {
      const ariaLabelCount = (content.match(/aria-label=/g) ?? []).length;
      // The component uses a computed aria-label in a loop; the template has 1 aria-label=
      expect(ariaLabelCount).toBeGreaterThanOrEqual(1);
    });

    it("hides decorative icons from screen reader", () => {
      expect(content).toMatch(/aria-hidden="true"/);
    });

    it("uses focus-visible:ring for keyboard focus", () => {
      expect(content).toMatch(/focus-visible:ring/);
    });
  });

  describe("RoleEmptyState", () => {
    const content = readFile("role-empty-state.tsx");

    it("uses role='status' for empty state container", () => {
      expect(content).toMatch(/role="status"/);
    });

    it("uses aria-live='polite' for announcement", () => {
      expect(content).toMatch(/aria-live="polite"/);
    });

    it("hides decorative icons", () => {
      const count = (content.match(/aria-hidden="true"/g) ?? []).length;
      expect(count).toBeGreaterThanOrEqual(2);
    });
  });

  describe("TrendAreaChart", () => {
    const widgetFiles = readdirSync(WIDGETS_DIR);
    const chartFile = widgetFiles.find((f) => f === "trend-area-chart.tsx");
    expect(chartFile).toBeDefined();
    const content = readFile(chartFile!, WIDGETS_DIR);

    it("has sr-only summary for chart data", () => {
      expect(content).toMatch(/sr-only/);
    });

    it("uses role='img' with aria-label for chart", () => {
      expect(content).toMatch(/role="img"/);
      expect(content).toMatch(/aria-label/);
    });

    it("hides decorative icon (TrendingUp)", () => {
      expect(content).toMatch(/aria-hidden="true"/);
    });
  });

  describe("CategoryDonutChart", () => {
    const content = readFile("category-donut-chart.tsx", WIDGETS_DIR);

    it("has sr-only summary for chart data", () => {
      expect(content).toMatch(/sr-only/);
    });

    it("uses role='img' with aria-label for chart", () => {
      expect(content).toMatch(/role="img"/);
      expect(content).toMatch(/aria-label/);
    });

    it("uses role='status' for empty state", () => {
      expect(content).toMatch(/role="status"/);
    });
  });

  describe("List widgets (TopBooks, TopMembers, RecentLoans)", () => {
    const widgetFiles = readdirSync(WIDGETS_DIR);

    it("TopBooksList has aria-label on list", () => {
      const content = readFile("top-books-list.tsx", WIDGETS_DIR);
      expect(content).toMatch(/aria-label.*={title}/);
    });

    it("TopBooksList has aria-label on each item button", () => {
      const content = readFile("top-books-list.tsx", WIDGETS_DIR);
      // Button has aria-label like "Lihat detail {title}"
      expect(content).toMatch(/aria-label.*Lihat detail/);
    });

    it("TopMembersList has aria-label on each item button", () => {
      const content = readFile("top-members-list.tsx", WIDGETS_DIR);
      expect(content).toMatch(/aria-label.*Lihat detail anggota/);
    });

    it("RecentLoansTable has scope='col' on headers", () => {
      const content = readFile("recent-loans-table.tsx", WIDGETS_DIR);
      expect(content).toMatch(/scope="col"/);
    });

    it("RecentLoansTable has <caption> with sr-only class", () => {
      const content = readFile("recent-loans-table.tsx", WIDGETS_DIR);
      expect(content).toMatch(/<caption[^>]*sr-only/);
    });

    it("RecentLoansTable has <time> element with dateTime", () => {
      const content = readFile("recent-loans-table.tsx", WIDGETS_DIR);
      expect(content).toMatch(/<time[^>]*dateTime=/);
    });

    it("All list widgets have focus-visible:ring", () => {
      for (const f of ["top-books-list.tsx", "top-members-list.tsx", "recent-loans-table.tsx"]) {
        const content = readFile(f, WIDGETS_DIR);
        expect(content, `${f} missing focus-visible:ring`).toMatch(/focus-visible:ring/);
      }
    });

    it("All list widgets hide decorative icons", () => {
      for (const f of ["top-books-list.tsx", "top-members-list.tsx", "recent-loans-table.tsx"]) {
        const content = readFile(f, WIDGETS_DIR);
        expect(content, `${f} missing aria-hidden`).toMatch(/aria-hidden="true"/);
      }
    });
  });
});

describe("Accessibility — sidebar", () => {
    it("Logo button area has accessible click handler", () => {
      const content = readFileSync(
        join(__dirname, "../../layout/sidebar.tsx"),
        "utf-8"
      );
      // Logo button is a <button> with onClick — it's keyboard-accessible by default
      expect(content).toMatch(/<button onClick=\{goToHome\}/);
    });
});
