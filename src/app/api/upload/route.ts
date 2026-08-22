import { NextResponse } from "next/server";
import { requireLibrarian } from "@/lib/auth";
import {
  UPLOAD_DIR,
  COVER_ALLOWED_MIME,
  COVER_MAX_SIZE_BYTES,
  generateUniqueFileName,
  ensureUploadDir,
} from "@/lib/upload";
import path from "path";

const COVERS_SUBDIR = "covers";
const COVERS_DIR = path.join(UPLOAD_DIR, COVERS_SUBDIR);

export async function POST(req: Request) {
  const { error } = await requireLibrarian();
  if (error) return error;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Request body harus FormData" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "File wajib diisi" }, { status: 400 });
  }

  if (!COVER_ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json(
      { error: "Format file tidak didukung (hanya JPG, PNG, WEBP)" },
      { status: 400 }
    );
  }

  if (file.size > COVER_MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Ukuran file maksimal 3MB" },
      { status: 400 }
    );
  }

  await ensureUploadDir(COVERS_DIR);

  const filename = generateUniqueFileName(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = path.join(COVERS_DIR, filename);

  const { writeFile } = await import("fs/promises");
  await writeFile(filePath, buffer);

  const url = `/api/uploads/${COVERS_SUBDIR}/${filename}`;
  return NextResponse.json({ url });
}
