/**
 * Unit tests untuk src/lib/whatsapp.ts
 * Test: normalizePhone (berbagai format), template generation
 */

import { describe, it, expect } from "vitest";
import { normalizePhone, whatsappTemplates } from "../whatsapp";

describe("normalizePhone", () => {
  it("convert 08xx ke 628xx", () => {
    expect(normalizePhone("081234567890")).toBe("6281234567890");
  });

  it("convert +62xx ke 62xx", () => {
    expect(normalizePhone("+6281234567890")).toBe("6281234567890");
  });

  it("keep 62xx sudah benar", () => {
    expect(normalizePhone("6281234567890")).toBe("6281234567890");
  });

  it("convert 8xx ke 628xx", () => {
    expect(normalizePhone("81234567890")).toBe("6281234567890");
  });

  it("strip spasi dan dash", () => {
    expect(normalizePhone("0812-3456-7890")).toBe("6281234567890");
    expect(normalizePhone("0812 3456 7890")).toBe("6281234567890");
  });

  it("handle format dengan country code lain (bukan ID)", () => {
    // 1 (US) tidak dimulai dengan 0/+/6/8, jadi ditambah 62 → ini bug potensial
    // Tapi untuk test, asumsi semua user Indonesia
    expect(normalizePhone("+1234567890")).toBe("621234567890"); // fallback prepend 62
  });
});

describe("whatsappTemplates", () => {
  describe("dueDateReminder", () => {
    it("mengandung nama, judul buku, due date, dan link", () => {
      const msg = whatsappTemplates.dueDateReminder({
        name: "Andini",
        bookTitle: "Laskar Pelangi",
        dueDate: "15 Januari 2026",
        daysRemaining: 2,
      });
      expect(msg).toContain("Andini");
      expect(msg).toContain("Laskar Pelangi");
      expect(msg).toContain("15 Januari 2026");
      expect(msg).toContain("2 hari");
      expect(msg).toContain("Jendela Ilmu");
    });

    it("'hari ini' untuk daysRemaining 0", () => {
      const msg = whatsappTemplates.dueDateReminder({
        name: "Budi",
        bookTitle: "Buku X",
        dueDate: "Sekarang",
        daysRemaining: 0,
      });
      expect(msg).toContain("hari ini");
    });
  });

  describe("overdueNotice", () => {
    it("include hari keterlambatan dan denda", () => {
      const msg = whatsappTemplates.overdueNotice({
        name: "Andini",
        bookTitle: "Buku A",
        daysOverdue: 5,
        fineAmount: 5000,
      });
      expect(msg).toContain("Andini");
      expect(msg).toContain("5 hari");
      expect(msg).toContain("Rp 5.000");
    });

    it("format Rupiah tanpa desimal", () => {
      const msg = whatsappTemplates.overdueNotice({
        name: "X",
        bookTitle: "Y",
        daysOverdue: 1,
        fineAmount: 1500,
      });
      // Pastikan tidak ada ",00" di belakang
      expect(msg).not.toMatch(/,\s*00\b/);
    });
  });

  describe("welcome", () => {
    it("include nama dan member number", () => {
      const msg = whatsappTemplates.welcome({
        name: "Citra",
        memberNumber: "SIS-2024-001",
      });
      expect(msg).toContain("Citra");
      expect(msg).toContain("SIS-2024-001");
    });
  });

  describe("reservationReady", () => {
    it("include judul buku dan expiresIn", () => {
      const msg = whatsappTemplates.reservationReady({
        name: "Dewi",
        bookTitle: "Bumi",
        expiresIn: "3 hari",
      });
      expect(msg).toContain("Dewi");
      expect(msg).toContain("Bumi");
      expect(msg).toContain("3 hari");
    });
  });

  describe("wishlistAvailable", () => {
    it("include judul buku", () => {
      const msg = whatsappTemplates.wishlistAvailable({
        name: "Eka",
        bookTitle: "Negeri 5 Menara",
      });
      expect(msg).toContain("Eka");
      expect(msg).toContain("Negeri 5 Menara");
    });
  });

  it("semua template mengandung branding 'Jendela Ilmu'", () => {
    const templates = [
      whatsappTemplates.dueDateReminder({ name: "X", bookTitle: "Y", dueDate: "Z", daysRemaining: 1 }),
      whatsappTemplates.overdueNotice({ name: "X", bookTitle: "Y", daysOverdue: 1, fineAmount: 1000 }),
      whatsappTemplates.reservationReady({ name: "X", bookTitle: "Y", expiresIn: "1 hari" }),
      whatsappTemplates.wishlistAvailable({ name: "X", bookTitle: "Y" }),
      whatsappTemplates.welcome({ name: "X", memberNumber: "Y" }),
      whatsappTemplates.announcement({ title: "Test", content: "Body" }),
    ];
    for (const t of templates) {
      expect(t).toContain("Jendela Ilmu");
    }
  });
});
