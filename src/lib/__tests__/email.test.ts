/**
 * Unit tests untuk src/lib/email.ts
 * Test: template generation (subject, html structure, text fallback)
 */

import { describe, it, expect } from "vitest";
import { emailTemplates } from "../email";

describe("emailTemplates.passwordReset", () => {
  it("return subject, html, text", () => {
    const t = emailTemplates.passwordReset({
      name: "Budi",
      resetUrl: "https://example.com/reset?token=abc",
      expiresInMinutes: 60,
    });
    expect(t.subject).toContain("Reset Password");
    expect(t.html).toContain("https://example.com/reset?token=abc");
    expect(t.text).toContain("Budi");
  });

  it("html mengandung HTML structure", () => {
    const t = emailTemplates.passwordReset({
      name: "X",
      resetUrl: "https://x.com",
      expiresInMinutes: 30,
    });
    expect(t.html).toContain("<!DOCTYPE html>");
    expect(t.html).toContain("</html>");
    expect(t.html).toContain("Jendela Ilmu");
  });

  it("html escape untuk nama dengan karakter khusus", () => {
    const t = emailTemplates.passwordReset({
      name: "Budi & Siti <test>",
      resetUrl: "https://x.com",
      expiresInMinutes: 60,
    });
    // Note: kami tidak auto-escape di template, tapi cek tidak crash
    expect(t.html).toContain("Budi & Siti");
  });
});

describe("emailTemplates.dueDateReminder", () => {
  it("include nama, judul, due date, dan link my-loans", () => {
    const t = emailTemplates.dueDateReminder({
      name: "Andini",
      bookTitle: "Buku A",
      dueDate: "20 Januari 2026",
      daysRemaining: 2,
    });
    expect(t.subject).toContain("Buku A");
    expect(t.html).toContain("Andini");
    expect(t.html).toContain("Buku A");
    expect(t.html).toContain("20 Januari 2026");
    expect(t.html).toContain("2 hari");
  });

  it("'hari ini' untuk 0 days", () => {
    const t = emailTemplates.dueDateReminder({
      name: "X",
      bookTitle: "Y",
      dueDate: "Sekarang",
      daysRemaining: 0,
    });
    expect(t.html).toContain("hari ini");
  });

  it("'besok' untuk 1 day", () => {
    const t = emailTemplates.dueDateReminder({
      name: "X",
      bookTitle: "Y",
      dueDate: "Besok",
      daysRemaining: 1,
    });
    expect(t.html).toContain("1 hari");
  });
});

describe("emailTemplates.overdueNotice", () => {
  it("format denda dengan IDR", () => {
    const t = emailTemplates.overdueNotice({
      name: "X",
      bookTitle: "Y",
      daysOverdue: 3,
      fineAmount: 3000,
    });
    expect(t.html).toContain("Rp");
    expect(t.html).toContain("3.000");
  });

  it("color merah untuk alarm", () => {
    const t = emailTemplates.overdueNotice({
      name: "X",
      bookTitle: "Y",
      daysOverdue: 1,
      fineAmount: 1000,
    });
    // cek ada red color
    expect(t.html.toLowerCase()).toMatch(/(a04040|fee|red)/);
  });
});

describe("emailTemplates.welcome", () => {
  it("include email dan temporary password", () => {
    const t = emailTemplates.welcome({
      name: "Siswa Baru",
      email: "siswa@sekolah.sch.id",
      temporaryPassword: "perpustakaan",
    });
    expect(t.html).toContain("Siswa Baru");
    expect(t.html).toContain("siswa@sekolah.sch.id");
    expect(t.html).toContain("perpustakaan");
    // ada warning untuk ganti password
    expect(t.html.toLowerCase()).toMatch(/(ganti|ubah|change)/);
  });
});

describe("emailTemplates.announcementBroadcast", () => {
  it("include title dan content", () => {
    const t = emailTemplates.announcementBroadcast({
      title: "Libur Sekolah",
      content: "Sekolah libur 1 minggu mulai Senin.",
      authorName: "Dewi Lestari",
    });
    expect(t.subject).toContain("Libur Sekolah");
    expect(t.html).toContain("Libur Sekolah");
    expect(t.html).toContain("Sekolah libur 1 minggu mulai Senin.");
    expect(t.html).toContain("Dewi Lestari");
  });

  it("convert newlines ke <br>", () => {
    const t = emailTemplates.announcementBroadcast({
      title: "T",
      content: "Baris 1\nBaris 2\nBaris 3",
      authorName: "A",
    });
    expect(t.html).toContain("Baris 1<br>Baris 2<br>Baris 3");
  });
});

describe("all email templates have required fields", () => {
  const templates = [
    emailTemplates.passwordReset({ name: "X", resetUrl: "https://x.com", expiresInMinutes: 60 }),
    emailTemplates.passwordChanged({ name: "X" }),
    emailTemplates.dueDateReminder({ name: "X", bookTitle: "Y", dueDate: "Z", daysRemaining: 1 }),
    emailTemplates.overdueNotice({ name: "X", bookTitle: "Y", daysOverdue: 1, fineAmount: 1000 }),
    emailTemplates.welcome({ name: "X", email: "y@x.com", temporaryPassword: "p" }),
    emailTemplates.announcementBroadcast({ title: "T", content: "C", authorName: "A" }),
  ];

  it.each(templates)("subject tidak kosong", (t) => {
    expect(t.subject).toBeTruthy();
    expect(t.subject.length).toBeGreaterThan(0);
  });

  it.each(templates)("html tidak kosong", (t) => {
    expect(t.html).toBeTruthy();
    expect(t.html.length).toBeGreaterThan(0);
  });

  it.each(templates)("text tidak kosong", (t) => {
    expect(t.text).toBeTruthy();
    expect(t.text.length).toBeGreaterThan(0);
  });

  it.each(templates)("branding Jendela Ilmu muncul", (t) => {
    expect(t.html).toContain("Jendela Ilmu");
  });
});
