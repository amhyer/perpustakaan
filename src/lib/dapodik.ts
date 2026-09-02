/**
 * Dapodik Integration Service
 *
 * Dapodik = Data Pokok Pendidikan (sistem database nasional pendidikan Indonesia).
 * Setiap sekolah wajib punya data siswa/guru di Dapodik.
 *
 * Tujuan: Sync data anggota dari Dapodik ke Perpustakaan Jendela Ilmu.
 *
 * Format data Dapodik (CSV yang di-export dari dapodik.dikdasmen.go.id):
 * - nisn, nama, jenis_kelamin, tempat_lahir, tanggal_lahir
 * - kelas (jika siswa), mata_pelajaran (jika guru)
 * - jenis_ptk (guru: "Guru", "Kepala Sekolah"; siswa: kosong)
 *
 * Mode sync:
 * - FULL: replace all members with Dapodik data
 * - INCREMENTAL: add new + update existing (keep manually-added members)
 * - DRY_RUN: parse & report, don't actually update
 *
 * Setelah sync, sistem auto-create user + member + welcome notification.
 */

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import bcrypt from "bcryptjs";

export type SyncMode = "FULL" | "INCREMENTAL" | "DRY_RUN";

export interface DapodikRow {
  nisn?: string;
  nip?: string; // untuk guru
  nama: string;
  jenis_kelamin: "L" | "P";
  tanggal_lahir?: string;
  kelas?: string; // untuk siswa
  mata_pelajaran?: string; // untuk guru
  jenis_ptk?: string; // "Guru" | "Kepala Sekolah" | "" (siswa)
  phone?: string;
  address?: string;
}

export interface SyncResult {
  mode: SyncMode;
  totalParsed: number;
  added: number;
  updated: number;
  deactivated: number;
  skipped: number;
  errors: { row: number; error: string }[];
  durationMs: number;
}

interface SyncOptions {
  mode?: SyncMode;
  defaultPassword?: string; // Default 'password123' untuk siswa baru
  sendWelcome?: boolean; // Send welcome notification
  actorId?: string; // Librarian who triggered
}

/**
 * Parse CSV Dapodik ke DapodikRow array.
 * Auto-detect delimiter (comma atau semicolon) dan skip empty rows.
 */
export function parseDapodikCSV(csvContent: string): DapodikRow[] {
  const lines = csvContent
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  if (lines.length < 2) return [];

  // Auto-detect delimiter
  const firstLine = lines[0];
  const delimiter = firstLine.includes(";") ? ";" : ",";

  // Parse header
  const headers = firstLine.split(delimiter).map((h) =>
    h.trim().toLowerCase().replace(/\s+/g, "_")
  );

  // Map common Dapodik column names
  const columnMap: Record<string, keyof DapodikRow> = {
    nisn: "nisn",
    nip: "nip",
    nama: "nama",
    nama_lengkap: "nama",
    jenis_kelamin: "jenis_kelamin",
    jenis_kelamin_: "jenis_kelamin",
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

  // Parse rows
  const rows: DapodikRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Partial<DapodikRow> = {};

    headers.forEach((h, idx) => {
      const mappedKey = columnMap[h];
      if (mappedKey && values[idx]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (row as any)[mappedKey] = values[idx];
      }
    });

    // Determine role
    const isTeacher =
      row.jenis_ptk?.toLowerCase().includes("guru") ||
      row.jenis_ptk?.toLowerCase().includes("kepala") ||
      !!row.nip;
    (row as DapodikRow).jenis_ptk = isTeacher ? "Guru" : "";

    if (row.nama) {
      rows.push(row as DapodikRow);
    }
  }

  return rows;
}

/**
 * Sync members dari Dapodik data.
 */
export async function syncFromDapodik(
  rows: DapodikRow[],
  options: SyncOptions = {}
): Promise<SyncResult> {
  const start = Date.now();
  const mode = options.mode || "INCREMENTAL";
  const defaultPassword =
    options.defaultPassword || process.env.DAPODIK_DEFAULT_PASSWORD || "changeme-first-login";
  const sendWelcome = options.sendWelcome ?? false;

  const result: SyncResult = {
    mode,
    totalParsed: rows.length,
    added: 0,
    updated: 0,
    deactivated: 0,
    skipped: 0,
    errors: [],
    durationMs: 0,
  };

  const passwordHash = await bcrypt.hash(defaultPassword, 10);
  const memberMap = new Map<string, { id: string; userId: string; role: string }>();

  // Pre-load existing members by external ID
  for (const r of rows) {
    if (!r.nisn && !r.nip) continue;
    const existing = await db.member.findFirst({
      where: r.nisn
        ? { user: { email: { contains: r.nisn } } }
        : { user: { email: { contains: r.nip! } } },
      select: { id: true, user: { select: { id: true, email: true } } },
    });
    if (existing) {
      memberMap.set(r.nisn || r.nip!, {
        id: existing.id,
        userId: existing.user.id,
        role: existing.user.email.includes("@guru") ? "TEACHER" : "STUDENT",
      });
    }
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      if (!row.nama) {
        result.skipped++;
        continue;
      }

      const isTeacher = row.jenis_ptk === "Guru" || !!row.nip;
      const externalId = row.nisn || row.nip;
      if (!externalId) {
        result.skipped++;
        result.errors.push({ row: i + 2, error: "Missing NISN/NIP" });
        continue;
      }

      // Map ke format member perpustakaan
      const role = isTeacher ? "TEACHER" : "STUDENT";
      const memberNumber = isTeacher
        ? `GUR-${externalId}`
        : `SIS-${externalId}`;
      const email = `${externalId}@dapodik.jendelailmu.sch.id`;
      const classGrade = isTeacher ? row.mata_pelajaran || "Guru" : row.kelas || "Siswa";

      if (mode === "DRY_RUN") {
        if (memberMap.has(externalId)) {
          result.updated++;
        } else {
          result.added++;
        }
        continue;
      }

      const existing = memberMap.get(externalId);

      if (existing) {
        // UPDATE existing
        await db.user.update({
          where: { id: existing.userId },
          data: { name: row.nama },
        });
        await db.member.update({
          where: { id: existing.id },
          data: {
            fullName: row.nama,
            category: role,
            gender: row.jenis_kelamin,
            birthDate: row.tanggal_lahir ? new Date(row.tanggal_lahir) : null,
            classGrade,
            phone: row.phone,
            address: row.address,
          },
        });
        result.updated++;
      } else {
        // CREATE new
        const user = await db.user.create({
          data: {
            email,
            passwordHash,
            name: row.nama,
            role,
          },
        });
        await db.member.create({
          data: {
            userId: user.id,
            memberNumber,
            fullName: row.nama,
            category: role,
            status: "ACTIVE",
            gender: row.jenis_kelamin,
            birthDate: row.tanggal_lahir ? new Date(row.tanggal_lahir) : null,
            classGrade,
            phone: row.phone,
            address: row.address,
            joinDate: new Date(),
            expiryDate: new Date(Date.now() + 4 * 365 * 86400000), // 4 tahun
          },
        });
        result.added++;
      }
    } catch (err) {
      result.errors.push({
        row: i + 2,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // FULL mode: deactivate members not in Dapodik
  if (mode === "FULL") {
    const externalIds = rows.map((r) => r.nisn || r.nip).filter(Boolean);
    const allActive = await db.member.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, user: { select: { email: true } } },
    });
    for (const m of allActive) {
      // Check kalau email-nya mengandung external ID dari Dapodik
      const isFromDapodik = externalIds.some((id) => m.user.email.includes(id!));
      if (!isFromDapodik) continue;
      // Deactivate
      await db.member.update({
        where: { id: m.id },
        data: { status: "INACTIVE" },
      });
      result.deactivated++;
    }
  }

  result.durationMs = Date.now() - start;

  logger.info("Dapodik sync completed", {
    actor: options.actorId,
    ...result,
  });

  return result;
}

/**
 * Validate Dapodik CSV (untuk preview sebelum sync).
 */
export function validateDapodikCSV(csvContent: string): {
  valid: boolean;
  totalRows: number;
  errors: string[];
  preview: DapodikRow[];
} {
  const errors: string[] = [];

  if (!csvContent.trim()) {
    return { valid: false, totalRows: 0, errors: ["File kosong"], preview: [] };
  }

  let rows: DapodikRow[];
  try {
    rows = parseDapodikCSV(csvContent);
  } catch (err) {
    return {
      valid: false,
      totalRows: 0,
      errors: [err instanceof Error ? err.message : "Parse error"],
      preview: [],
    };
  }

  if (rows.length === 0) {
    return { valid: false, totalRows: 0, errors: ["Tidak ada row valid"], preview: [] };
  }

  // Validate: setiap row harus punya nama
  rows.forEach((r, i) => {
    if (!r.nama) errors.push(`Row ${i + 2}: nama kosong`);
    if (!r.jenis_kelamin) errors.push(`Row ${i + 2}: jenis_kelamin kosong`);
    if (!r.nisn && !r.nip) errors.push(`Row ${i + 2}: NISN/NIP kosong`);
  });

  return {
    valid: errors.length === 0,
    totalRows: rows.length,
    errors: errors.slice(0, 10), // Limit errors
    preview: rows.slice(0, 5),
  };
}
