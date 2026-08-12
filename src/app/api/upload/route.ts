import { NextResponse } from "next/server";
import path from "path";
import { requireLibrarian } from "@/lib/auth";
import {
  UPLOAD_DIR,
  COVER_ALLOWED_MIME,
  COVER_MAX_SIZE_BYTES,
  generateUniqueFileName,
  ensureUploadDir,
} from "@/lib/upload";

// POST /api/upload — upload file umum (saat ini hanya untuk cover gambar)
// Body: FormData dengan field "file"
// Response: { url: string }
export async function POST(req: Request) {
  const { error } = await requireLibrarian();
  if (error) return error;

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "File wajib diisi" }, { status: 400 });
    }

    // Validasi tipe
    if (!COVER_ALLOWED_MIME.includes(file.type)) {
      return NextResponse.json(
        { error: `Format file tidak didukung. Hanya: ${COVER_ALLOWED_MIME.join(", ")}` },
        { status: 400 }
      );
    }

    // Validasi ukuran
    if (file.size > COVER_MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Ukuran file melebihi batas ${(COVER_MAX_SIZE_BYTES / 1024 / 1024).toFixed(0)}MB` },
        { status: 400 }
      );
    }

    // Pastikan direktori uploads ada
    const uploadDir = path.join(UPLOAD_DIR, "covers");
    await ensureUploadDir(uploadDir);

    // Generate nama unik
    const uniqueName = generateUniqueFileName(file.name);
    const filePath = path.join(uploadDir, uniqueName);

    // Tulis file ke disk
    const buffer = Buffer.from(await file.arrayBuffer());
    const { writeFile } = await import("fs/promises");
    await writeFile(filePath, buffer);

    // URL relatif untuk akses via HTTP via route /api/uploads (bukan statis)
    // supaya file bisa di-serve dari UPLOAD_DIR di mana pun lokasinya.
    const url = `/api/uploads/covers/${uniqueName}`;

    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "Gagal mengunggah file" }, { status: 500 });
  }
}
