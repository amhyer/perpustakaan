import { NextResponse } from "next/server";
import path from "path";
import { UPLOAD_DIR } from "@/lib/upload";
import { promises as fs } from "fs";

// GET /api/uploads/[...file] — serve uploaded file dari UPLOAD_DIR
// Catch-all route: /api/uploads/attachments/xxx.pdf → file = ["attachments", "xxx.pdf"]
// Semua role bisa akses (file publik untuk anggota yang sudah login).

const MIME_MAP: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ file: string[] }> }
) {
  const { file: fileParts } = await params;

  // Cegah path traversal: reject kalau ada ".."
  if (fileParts.some((p) => p === "..")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  // Join parts dengan path separator untuk dapat relative path
  const relativePath = fileParts.join("/");
  const filePath = path.join(UPLOAD_DIR, relativePath);

  // Safety: pastikan filePath masih di dalam UPLOAD_DIR (cegah escape)
  const normalizedUpload = path.resolve(UPLOAD_DIR);
  const normalizedFile = path.resolve(filePath);
  if (!normalizedFile.startsWith(normalizedUpload + path.sep) && normalizedFile !== normalizedUpload) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(relativePath).toLowerCase();
    const mime = MIME_MAP[ext] || "application/octet-stream";
    // inline untuk gambar/PDF agar bisa dibuka di browser, attachment untuk
    // audio/unknown agar terdownload
    const disposition = ext === ".mp3" || ext === ".wav" || ext === ".ogg" || mime === "application/octet-stream"
      ? "attachment"
      : "inline";
    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Length": String(data.length),
        "Content-Disposition": disposition,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
  }
}
