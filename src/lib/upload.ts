import path from "path";
import { promises as fs } from "fs";

// UPLOAD_DIR: direktori root untuk semua file upload.
// - Development (next dev): cwd = project root, pakai public/uploads di sana
// - Production standalone (next start): WAJIB set env UPLOAD_DIR ke path absolut
//   yang writable (mis. /home/z/my-project/public/uploads). Kalau tidak di-set,
//   fallback ke cwd/public/uploads (cwd standalone = .next/standalone, jadi
//   file akan di .next/standalone/public/uploads — tidak ideal tapi jalan).
export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");

// Sub-direktori untuk lampiran buku (dibedakan dari cover gambar)
export const ATTACHMENTS_SUBDIR = "attachments";

// Path absolut ke folder attachments
export const ATTACHMENTS_DIR = path.join(UPLOAD_DIR, ATTACHMENTS_SUBDIR);

// URL prefix untuk akses file attachments via HTTP.
// Pakai /api/uploads/... route (bukan /uploads/... statis) supaya file bisa
// di-serve dari UPLOAD_DIR di mana pun lokasinya (dev: project root public,
// prod standalone: project root public — selalu di luar .next/standalone).
// Route /api/uploads/[file] akan baca dari UPLOAD_DIR.
export const ATTACHMENTS_URL_PREFIX = `/api/uploads/${ATTACHMENTS_SUBDIR}`;

/**
 * Batasan tipe & ukuran file lampiran (Tahap 15-D)
 */
export const ATTACHMENT_MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

// Tipe MIME yang diizinkan: PDF, gambar, audio — TANPA video
export const ATTACHMENT_ALLOWED_MIME: Record<string, string[]> = {
  pdf: ["application/pdf"],
  image: ["image/jpeg", "image/png", "image/webp", "image/jpg", "image/gif"],
  audio: ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/ogg"],
};

export const ATTACHMENT_ALLOWED_MIME_LIST = Object.values(ATTACHMENT_ALLOWED_MIME).flat();

/**
 * Validasi tipe file berdasarkan MIME type.
 * Return kategori ('pdf' | 'image' | 'audio') atau null jika tidak diizinkan.
 */
export function validateAttachmentMime(mime: string): "pdf" | "image" | "audio" | null {
  if (ATTACHMENT_ALLOWED_MIME.pdf.includes(mime)) return "pdf";
  if (ATTACHMENT_ALLOWED_MIME.image.includes(mime)) return "image";
  if (ATTACHMENT_ALLOWED_MIME.audio.includes(mime)) return "audio";
  return null;
}

/**
 * Validasi tipe file untuk cover gambar (hanya gambar).
 */
export const COVER_ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
export const COVER_MAX_SIZE_BYTES = 3 * 1024 * 1024; // 3MB

/**
 * Generate nama file unik untuk hindari collision.
 * Format: <timestamp>-<random6>.<ext>
 */
export function generateUniqueFileName(originalName: string): string {
  const ext = path.extname(originalName);
  const base = path.basename(originalName, ext);
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  // Sanitize base name: keep alphanumeric + dash only
  const safeBase = base.replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 50) || "file";
  return `${safeBase}-${timestamp}-${random}${ext.toLowerCase()}`;
}

/**
 * Pastikan direktori upload ada. Buat rekursif kalau belum.
 */
export async function ensureUploadDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

/**
 * Hapus file dari disk. Tidak throw kalau file tidak ada (sudah dihapus).
 */
export async function deleteFileIfExists(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (err: unknown) {
    // Ignore error if file doesn't exist
    if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") {
      return;
    }
    throw err;
  }
}

/**
 * Convert ukuran bytes ke string human-readable.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
