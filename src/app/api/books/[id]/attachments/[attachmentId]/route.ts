import { NextResponse } from "next/server";
import path from "path";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { UPLOAD_DIR, deleteFileIfExists } from "@/lib/upload";

// DELETE /api/books/[id]/attachments/[attachmentId] — hapus lampiran
// Hanya LIBRARIAN. Hapus file dari disk DAN record dari DB.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const { error } = await requireRole("LIBRARIAN");
  if (error) return error;

  const { id, attachmentId } = await params;

  try {
    const attachment = await db.bookAttachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      return NextResponse.json({ error: "Lampiran tidak ditemukan" }, { status: 404 });
    }

    // Safety: pastikan attachment milik book yang benar
    if (attachment.bookId !== id) {
      return NextResponse.json({ error: "Lampiran tidak terkait buku ini" }, { status: 400 });
    }

    // Hapus file dari disk
    // fileUrl format: /uploads/attachments/xxx.pdf
    // Kita perlu convert ke path absolut di disk
    const relativePath = attachment.fileUrl.replace(/^\/uploads\//, "");
    const absolutePath = path.join(UPLOAD_DIR, relativePath);
    await deleteFileIfExists(absolutePath);

    // Hapus record dari DB
    await db.bookAttachment.delete({ where: { id: attachmentId } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus lampiran" }, { status: 500 });
  }
}
