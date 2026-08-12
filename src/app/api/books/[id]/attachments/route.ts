import { NextResponse } from "next/server";
import path from "path";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  ATTACHMENTS_DIR,
  ATTACHMENTS_URL_PREFIX,
  ATTACHMENT_MAX_SIZE_BYTES,
  validateAttachmentMime,
  generateUniqueFileName,
  ensureUploadDir,
  formatFileSize,
} from "@/lib/upload";

// GET /api/books/[id]/attachments — daftar lampiran buku
// Semua role bisa lihat (read-only untuk guru/siswa)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  const book = await db.book.findUnique({ where: { id }, select: { id: true } });
  if (!book) {
    return NextResponse.json({ error: "Buku tidak ditemukan" }, { status: 404 });
  }

  const attachments = await db.bookAttachment.findMany({
    where: { bookId: id },
    orderBy: { uploadedAt: "desc" },
  });

  return NextResponse.json(attachments);
}

// POST /api/books/[id]/attachments — upload lampiran baru (LIBRARIAN only)
// Body: FormData dengan field "file"
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (user!.role !== "LIBRARIAN") {
    return NextResponse.json({ error: "Hanya pustakawan yang dapat mengunggah lampiran" }, { status: 403 });
  }

  const { id } = await params;

  const book = await db.book.findUnique({ where: { id }, select: { id: true, title: true } });
  if (!book) {
    return NextResponse.json({ error: "Buku tidak ditemukan" }, { status: 404 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "File wajib diisi" }, { status: 400 });
    }

    // Validasi tipe file (PDF, gambar, audio — TANPA video)
    const category = validateAttachmentMime(file.type);
    if (!category) {
      return NextResponse.json(
        {
          error: `Tipe file "${file.type}" tidak diizinkan. Hanya PDF, gambar (JPEG/PNG/WEBP/GIF), dan audio (MP3/WAV/OGG).`,
        },
        { status: 400 }
      );
    }

    // Validasi ukuran (maks 15MB)
    if (file.size > ATTACHMENT_MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Ukuran file melebihi batas ${formatFileSize(ATTACHMENT_MAX_SIZE_BYTES)}. File Anda: ${formatFileSize(file.size)}.` },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "File kosong" }, { status: 400 });
    }

    // Pastikan direktori attachments ada
    await ensureUploadDir(ATTACHMENTS_DIR);

    // Generate nama unik + simpan file
    const uniqueName = generateUniqueFileName(file.name);
    const filePath = path.join(ATTACHMENTS_DIR, uniqueName);
    const buffer = Buffer.from(await file.arrayBuffer());
    const { writeFile } = await import("fs/promises");
    await writeFile(filePath, buffer);

    // URL relatif untuk akses via HTTP
    const fileUrl = `${ATTACHMENTS_URL_PREFIX}/${uniqueName}`;

    // Simpan metadata ke DB
    const attachment = await db.bookAttachment.create({
      data: {
        bookId: id,
        fileName: file.name,
        fileUrl,
        fileType: file.type,
        fileSizeBytes: file.size,
      },
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal mengunggah lampiran" }, { status: 500 });
  }
}
