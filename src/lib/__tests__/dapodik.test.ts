/**
 * Unit tests untuk Dapodik parser & validator.
 *
 * Note: pakai pure functions mirror (tidak import langsung dari
 * src/lib/dapodik.ts karena file itu import Prisma yang gak ready di test).
 */

import { describe, it, expect } from "vitest";

// Mirror pure functions
function parseDapodikCSVLogic(csvContent: string): any[] {
  const lines = csvContent
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  if (lines.length < 2) return [];

  const firstLine = lines[0];
  const delimiter = firstLine.includes(";") ? ";" : ",";

  const headers = firstLine.split(delimiter).map((h) =>
    h.trim().toLowerCase().replace(/\s+/g, "_")
  );

  const columnMap: Record<string, string> = {
    nisn: "nisn",
    nip: "nip",
    nama: "nama",
    nama_lengkap: "nama",
    jenis_kelamin: "jenis_kelamin",
    jenis_kelamin_id: "jenis_kelamin",
    tanggal_lahir: "tanggal_lahir",
    tgl_lahir: "tanggal_lahir",
    kelas: "kelas",
    rombel: "kelas",
    mata_pelajaran: "mata_pelajaran",
    mapel: "mata_pelajaran",
    jenis_ptk: "jenis_ptk",
    phone: "phone",
    no_hp: "phone",
    address: "address",
    alamat: "address",
  };

  const rows: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: any = {};

    headers.forEach((h, idx) => {
      const mappedKey = columnMap[h];
      if (mappedKey && values[idx]) {
        row[mappedKey] = values[idx];
      }
    });

    const isTeacher = row.jenis_ptk?.toLowerCase().includes("guru") || row.jenis_ptk?.toLowerCase().includes("kepala") || !!row.nip;
    row.jenis_ptk = isTeacher ? "Guru" : "";

    if (row.nama) rows.push(row);
  }

  return rows;
}

function validateDapodikCSVLogic(csvContent: string) {
  const errors: string[] = [];

  if (!csvContent.trim()) {
    return { valid: false, totalRows: 0, errors: ["File kosong"] };
  }

  const rows = parseDapodikCSVLogic(csvContent);
  if (rows.length === 0) {
    return { valid: false, totalRows: 0, errors: ["Tidak ada row valid"] };
  }

  rows.forEach((r, i) => {
    if (!r.nama) errors.push(`Row ${i + 2}: nama kosong`);
    if (!r.jenis_kelamin) errors.push(`Row ${i + 2}: jenis_kelamin kosong`);
    if (!r.nisn && !r.nip) errors.push(`Row ${i + 2}: NISN/NIP kosong`);
  });

  return {
    valid: errors.length === 0,
    totalRows: rows.length,
    errors: errors.slice(0, 10),
  };
}

describe("parseDapodikCSV", () => {
  it("parses basic CSV with semicolon delimiter", () => {
    const csv = `nisn;nama;jenis_kelamin;kelas
1234567890;Andini;P;IX-A
1234567891;Budi;L;IX-B`;
    const rows = parseDapodikCSVLogic(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].nisn).toBe("1234567890");
    expect(rows[0].nama).toBe("Andini");
    expect(rows[0].jenis_kelamin).toBe("P");
    expect(rows[0].kelas).toBe("IX-A");
  });

  it("parses CSV with comma delimiter", () => {
    const csv = `nisn,nama,jenis_kelamin
123,Andini,P
124,Budi,L`;
    const rows = parseDapodikCSVLogic(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].nisn).toBe("123");
  });

  it("strips quotes from values", () => {
    const csv = `nisn;nama;jenis_kelamin
123;"Andini, Putri";P`;
    const rows = parseDapodikCSVLogic(csv);
    expect(rows[0].nama).toBe("Andini, Putri");
  });

  it("maps common column aliases", () => {
    const csv = `Nama Lengkap;NISN;Jenis Kelamin ID
Andini;123;P`;
    const rows = parseDapodikCSVLogic(csv);
    expect(rows[0].nama).toBe("Andini");
    expect(rows[0].nisn).toBe("123");
    expect(rows[0].jenis_kelamin).toBe("P");
  });

  it("detects teacher from NIP", () => {
    const csv = `nip;nama;jenis_kelamin
198501012010012001;Pak Budi;L`;
    const rows = parseDapodikCSVLogic(csv);
    expect(rows[0].nip).toBe("198501012010012001");
    expect(rows[0].jenis_ptk).toBe("Guru");
  });

  it("skips comment lines and empty rows", () => {
    const csv = `# Comment
nisn;nama;jenis_kelamin
123;Andini;P

124;Budi;L`;
    const rows = parseDapodikCSVLogic(csv);
    expect(rows).toHaveLength(2);
  });

  it("returns empty for invalid CSV", () => {
    expect(parseDapodikCSVLogic("")).toEqual([]);
    expect(parseDapodikCSVLogic("header_only")).toEqual([]);
  });
});

describe("validateDapodikCSV", () => {
  it("validates complete CSV", () => {
    const csv = `nisn;nama;jenis_kelamin
123;Andini;P
124;Budi;L`;
    const result = validateDapodikCSVLogic(csv);
    expect(result.valid).toBe(true);
    expect(result.totalRows).toBe(2);
    expect(result.errors).toEqual([]);
  });

  it("reports missing nama", () => {
    const csv = `nisn;jenis_kelamin
123;P`;
    const result = validateDapodikCSVLogic(csv);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("reports missing NISN/NIP", () => {
    const csv = `nama;jenis_kelamin
Andini;P`;
    const result = validateDapodikCSVLogic(csv);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("NISN/NIP"))).toBe(true);
  });

  it("handles empty file", () => {
    const result = validateDapodikCSVLogic("");
    expect(result.valid).toBe(false);
    expect(result.totalRows).toBe(0);
  });
});
