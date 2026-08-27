import { describe, it, expect } from "vitest";
import {
  buildClassActivity,
  buildClassmateRows,
  buildClassPulse,
  buildClassRanking,
  buildSilentStudents,
  buildTodayFocus,
  describeLoanRules,
  describePulse,
  isSilentStudent,
  summarizePulse,
} from "../member-dashboard";
import { LOAN_RULES } from "../constants";

describe("buildClassActivity", () => {
  it("return kosong jika tidak ada siswa", () => {
    expect(buildClassActivity([])).toEqual([]);
  });

  it("agregasi per kelas + fallback tanpa kelas", () => {
    const rows = buildClassActivity([
      { classGrade: "IX-A", activeLoanCount: 2, overdueLoanCount: 1, returnedThisYearCount: 4 },
      { classGrade: "IX-A", activeLoanCount: 0, overdueLoanCount: 0, returnedThisYearCount: 1 },
      { classGrade: null, activeLoanCount: 1, overdueLoanCount: 0, returnedThisYearCount: 0 },
      { classGrade: "  ", activeLoanCount: 0, overdueLoanCount: 1, returnedThisYearCount: 2 },
    ]);

    expect(rows).toHaveLength(2);
    const ninth = rows.find((r) => r.classGrade === "IX-A");
    const none = rows.find((r) => r.classGrade === "Tanpa Kelas");
    expect(ninth).toEqual({
      classGrade: "IX-A",
      studentCount: 2,
      activeLoans: 2,
      overdueLoans: 1,
      booksReadThisYear: 5,
    });
    expect(none).toEqual({
      classGrade: "Tanpa Kelas",
      studentCount: 2,
      activeLoans: 1,
      overdueLoans: 1,
      booksReadThisYear: 2,
    });
  });

  it("urutkan nama kelas secara alfabetis", () => {
    const rows = buildClassActivity([
      { classGrade: "IX-A", activeLoanCount: 0, overdueLoanCount: 0, returnedThisYearCount: 0 },
      { classGrade: "VII-C", activeLoanCount: 0, overdueLoanCount: 0, returnedThisYearCount: 0 },
      { classGrade: "VIII-B", activeLoanCount: 0, overdueLoanCount: 0, returnedThisYearCount: 0 },
    ]);
    expect(rows.map((r) => r.classGrade)).toEqual(["IX-A", "VII-C", "VIII-B"]);
  });
});

describe("buildClassmateRows", () => {
  const mates = [
    { id: "a", fullName: "Andi", memberNumber: "S1", loanCount: 3 },
    { id: "me", fullName: "Saya", memberNumber: "S0", loanCount: 99 },
    { id: "b", fullName: "Budi", memberNumber: "S2", loanCount: 5 },
    { id: "c", fullName: "Citra", memberNumber: "S3", loanCount: 5 },
  ];

  it("mengeluarkan diri sendiri dan memberi peringkat", () => {
    const rows = buildClassmateRows(mates, "me");
    expect(rows.map((r) => r.id)).toEqual(["b", "c", "a"]);
    expect(rows[0].rank).toBe(1);
    expect(rows[2].rank).toBe(3);
  });

  it("tie-break nama, lalu potong limit", () => {
    const rows = buildClassmateRows(mates, "me", 2);
    expect(rows).toHaveLength(2);
    expect(rows[0].fullName).toBe("Budi");
    expect(rows[1].fullName).toBe("Citra");
  });
});

describe("describeLoanRules", () => {
  it("siswa lebih ketat dari guru", () => {
    const student = describeLoanRules(LOAN_RULES.STUDENT);
    const teacher = describeLoanRules(LOAN_RULES.TEACHER);
    expect(student.maxBooks).toBeLessThan(teacher.maxBooks);
    expect(student.loanDays).toBeLessThan(teacher.loanDays);
    expect(student.finePerDay).toBeGreaterThan(teacher.finePerDay);
    expect(student.maxRenewals).toBeLessThan(teacher.maxRenewals);
    expect(student.summary).toMatch(/3 buku/);
    expect(teacher.summary).toMatch(/5 buku/);
  });

  it("denda 0 ditulis tanpa denda", () => {
    const text = describeLoanRules(LOAN_RULES.LIBRARIAN).summary;
    expect(text).toMatch(/tanpa denda/i);
  });
});

describe("class pulse & siswa diam", () => {
  const now = new Date("2026-08-23T08:00:00.000Z");

  it("diam jika tidak ada aktivitas atau ≥ 30 hari", () => {
    expect(isSilentStudent(null, now)).toBe(true);
    expect(isSilentStudent(new Date("2026-07-20T00:00:00.000Z"), now)).toBe(true);
    expect(isSilentStudent(new Date("2026-08-10T00:00:00.000Z"), now)).toBe(false);
  });

  it("pulsa kelas: sedang baca, terlambat, diam, belum pinjam bulan ini", () => {
    const rows = buildClassPulse(
      [
        {
          classGrade: "IX-A",
          activeLoanCount: 2,
          overdueLoanCount: 0,
          lastActivityAt: "2026-08-20",
          loanThisMonth: true,
        },
        {
          classGrade: "IX-A",
          activeLoanCount: 1,
          overdueLoanCount: 1,
          lastActivityAt: "2026-08-08",
          loanThisMonth: true,
        },
        {
          classGrade: "IX-A",
          activeLoanCount: 0,
          overdueLoanCount: 0,
          lastActivityAt: "2026-06-01",
          loanThisMonth: false,
        },
      ],
      now
    );
    expect(rows).toEqual([
      {
        classGrade: "IX-A",
        studentCount: 3,
        readingCount: 2,
        overdueStudentCount: 1,
        silentCount: 1,
        noLoanThisMonthCount: 1,
      },
    ]);
    expect(describePulse(rows[0])).toBe(
      "2 dari 3 siswa sedang membaca · 1 terlambat · 1 diam 30 hari"
    );
  });

  it("summarizePulse gabung beberapa kelas", () => {
    const sum = summarizePulse(
      buildClassPulse(
        [
          { classGrade: "IX-A", activeLoanCount: 1, overdueLoanCount: 0, lastActivityAt: now, loanThisMonth: true },
          { classGrade: "VIII-B", activeLoanCount: 0, overdueLoanCount: 0, lastActivityAt: null, loanThisMonth: false },
        ],
        now
      )
    );
    expect(sum.studentCount).toBe(2);
    expect(sum.readingCount).toBe(1);
    expect(sum.silentCount).toBe(1);
    expect(sum.classGrade).toBe("Semua kelas");
  });

  it("daftar siswa diam: yang paling lama di atas, tanpa aktivitas di puncak", () => {
    const rows = buildSilentStudents(
      [
        { id: "a", fullName: "Andini", memberNumber: "S1", classGrade: "IX-A", lastActivityAt: "2026-08-20" },
        { id: "n", fullName: "Nayla", memberNumber: "S3", classGrade: "VII-C", lastActivityAt: null },
        { id: "r", fullName: "Rafi", memberNumber: "S2", classGrade: "VIII-B", lastActivityAt: "2026-06-01" },
      ],
      now
    );
    expect(rows.map((r) => r.id)).toEqual(["n", "r"]);
    expect(rows[0].daysSinceActivity).toBeNull();
  });
});

describe("buildClassRanking", () => {
  const mates = [
    { id: "a", fullName: "Andi", memberNumber: "S1", loanCount: 3 },
    { id: "me", fullName: "Saya", memberNumber: "S0", loanCount: 4 },
    { id: "b", fullName: "Budi", memberNumber: "S2", loanCount: 5 },
  ];

  it("menyertakan diri sendiri dan menghitung peringkat", () => {
    const rank = buildClassRanking(mates, "me");
    expect(rank.classSize).toBe(3);
    expect(rank.myRank).toBe(2);
    expect(rank.myLoanCount).toBe(4);
    expect(rank.rows.find((r) => r.isMe)?.fullName).toBe("Saya");
  });

  it("tetap menampilkan saya meski di luar top N", () => {
    const many = [
      { id: "me", fullName: "Saya", memberNumber: "S0", loanCount: 0 },
      { id: "b", fullName: "Budi", memberNumber: "S2", loanCount: 9 },
      { id: "c", fullName: "Citra", memberNumber: "S3", loanCount: 8 },
    ];
    const rank = buildClassRanking(many, "me", 2);
    expect(rank.rows).toHaveLength(2);
    expect(rank.rows.some((r) => r.isMe)).toBe(true);
    expect(rank.myRank).toBe(3);
  });
});

describe("buildTodayFocus", () => {
  it("prioritas terlambat > hampir tempo > siap ambil > sedang baca > rekomendasi", () => {
    expect(buildTodayFocus({ overdue: { title: "A", daysLate: 3, bookId: "1" } }).kind).toBe("overdue");
    expect(buildTodayFocus({ dueSoon: { title: "A", daysLeft: 1, bookId: "1" } }).kind).toBe("due-soon");
    expect(buildTodayFocus({ ready: { title: "A", bookId: "1" } }).kind).toBe("ready");
    expect(buildTodayFocus({ reading: { title: "A", daysLeft: 5, bookId: "1" } }).kind).toBe("reading");
    expect(buildTodayFocus({ recommend: { title: "A", bookId: "1" } }).kind).toBe("discover");
    expect(buildTodayFocus({}).kind).toBe("idle");
  });

  it("teks hampir tempo membedakan hari ini", () => {
    expect(buildTodayFocus({ dueSoon: { title: "Laskar", daysLeft: 0, bookId: "1" } }).detail).toMatch(/hari ini/);
  });
});
