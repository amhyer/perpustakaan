import { describe, it, expect } from "vitest";
import { isExposedSettingKey, sanitizeReservationQueue } from "../privacy";

describe("isExposedSettingKey", () => {
  it("blokir daftar bacaan guru", () => {
    expect(isExposedSettingKey("reading_list:abc")).toBe(false);
    expect(isExposedSettingKey("featured_book_id")).toBe(true);
    expect(isExposedSettingKey("library_name")).toBe(true);
  });
});

describe("sanitizeReservationQueue", () => {
  const rows = [
    {
      id: "r1",
      status: "PENDING",
      queueOrder: 1,
      member: { id: "me", fullName: "Andi", memberNumber: "S1", category: "STUDENT" },
    },
    {
      id: "r2",
      status: "PENDING",
      queueOrder: 2,
      member: { id: "other", fullName: "Budi Raharjo", memberNumber: "S2", category: "STUDENT" },
    },
  ];

  it("pustakawan melihat nama asli", () => {
    const out = sanitizeReservationQueue(rows, { isStaff: true, memberId: "me" });
    expect(out[1].member.fullName).toBe("Budi Raharjo");
    expect(out[1].member.memberNumber).toBe("S2");
  });

  it("anggota hanya melihat nama sendiri; orang lain jadi Antrian #N", () => {
    const out = sanitizeReservationQueue(rows, { isStaff: false, memberId: "me" });
    expect(out[0].member.fullName).toBe("Andi");
    expect(out[1].member.fullName).toBe("Antrian #2");
    expect(out[1].member.memberNumber).toBe("");
    expect(out[1].member.id).toBe("queue-2");
  });
});
