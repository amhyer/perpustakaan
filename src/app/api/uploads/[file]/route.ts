import { NextResponse } from "next/server";
import path from "path";
import { UPLOAD_DIR } from "@/lib/upload";

// GET /api/uploads/[file] — serve uploaded file dari UPLOAD_DIR custom
// (fallback kalau UPLOAD_DIR bukan di public/uploads)
// File di public/uploads di-serve statis oleh Next.js, tidak perlu route ini.
import { promises as fs } from "fs";

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
  { params }: { params: Promise<{ file: string }> }
) {
  const { file } = await params;

  // Cegah path traversal: hanya allow filename sederhana
  if (file.includes("..") || file.includes("/")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  // Cari file di sub-direktori yang mungkin (covers, attachments)
  // Route ini cuma fallback; utamanya file di-serve dari public/uploads
  const possiblePaths = [
    path.join(UPLOAD_DIR, "covers", file),
    path.join(UPLOAD_DIR, "attachments", file),
    path.join(UPLOAD_DIR, file),
  ];

  for (const p of possiblePaths) {
    try {
      const data = await fs.readFile(p);
      const ext = path.extname(file).toLowerCase();
      const mime = MIME_MAP[ext] || "application/octet-stream";
      return new NextResponse(data, {
        status: 200,
        headers: {
          "Content-Type": mime,
          "Cache-Control": "public, max-age=86400",
        },
      });
    } catch {
      // try next path
    }
  }

  return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
}
