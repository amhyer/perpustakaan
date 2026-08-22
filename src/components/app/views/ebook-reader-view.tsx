"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, FileText, Loader2, AlertCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/form/button";
import { Card, CardContent } from "@/components/ui/layout/card";
import { Badge } from "@/components/ui/data-display/badge";
import { useFetch } from "@/hooks/use-fetch";
import { useAppStore } from "@/store/use-app-store";
import { PdfViewer } from "@/components/app/shared/pdf-viewer";
import { api } from "@/lib/api-client";
import { formatRupiah, formatDate } from "@/lib/constants";
import { toast } from "sonner";
import { Suspense } from "react";

interface Attachment {
  id: string;
  bookId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSizeBytes: number;
  uploadedAt: string;
}

interface Book {
  id: string;
  title: string;
  author: string;
  coverColor: string;
  coverImage: string | null;
}

function EBookReaderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookId = searchParams.get("bookId");
  const attachmentId = searchParams.get("attachmentId");
  const user = useAppStore((s) => s.user);

  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);

  // Load book detail
  const { data: book, loading: loadingBook } = useFetch<Book | null>(
    bookId ? `/api/books/${bookId}` : null
  );

  // Load attachments
  const { data: attachments, loading: loadingAttachments } = useFetch<Attachment[]>(
    bookId ? `/api/books/${bookId}/attachments` : null
  );

  // Auto-select first PDF attachment
  useEffect(() => {
    if (attachmentId && attachments) {
      const found = attachments.find((a) => a.id === attachmentId);
      if (found) {
        setSelectedAttachment(found);
        return;
      }
    }
    if (attachments && attachments.length > 0 && !selectedAttachment) {
      const firstPdf = attachments.find((a) => a.fileType === "application/pdf");
      if (firstPdf) setSelectedAttachment(firstPdf);
    }
  }, [attachments, attachmentId, selectedAttachment]);

  const handleDownload = async () => {
    if (!selectedAttachment) return;
    try {
      // Trigger browser download
      const a = document.createElement("a");
      a.href = selectedAttachment.fileUrl;
      a.download = selectedAttachment.fileName;
      a.target = "_blank";
      a.click();
      toast.success("Download dimulai");
    } catch {
      toast.error("Gagal download");
    }
  };

  if (!bookId) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Buku Tidak Dipilih</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Silakan pilih buku yang memiliki lampiran digital untuk dibaca.
            </p>
            <Button onClick={() => router.push("/?view=catalog")}>
              <BookOpen className="h-4 w-4 mr-2" />
              Buka Katalog
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadingBook) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Buku Tidak Ditemukan</h3>
            <Button onClick={() => router.push("/?view=catalog")}>
              Kembali ke Katalog
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If no attachment selected, show selection UI
  if (!selectedAttachment) {
    return (
      <div className="p-4 lg:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Button onClick={() => router.back()} variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Button>
        </div>

        <div>
          <h1 className="text-2xl font-bold">{book.title}</h1>
          <p className="text-muted-foreground">oleh {book.author}</p>
        </div>

        {loadingAttachments ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
            </CardContent>
          </Card>
        ) : !attachments || attachments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Tidak Ada Lampiran Digital</h3>
              <p className="text-sm text-muted-foreground">
                Buku ini belum memiliki file digital yang bisa dibaca.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {attachments.map((att) => (
              <Card
                key={att.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedAttachment(att)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{att.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {att.fileType} · {(att.fileSizeBytes / 1024).toFixed(0)} KB
                      </p>
                      <Badge variant="outline" className="mt-2 text-[10px]">
                        {att.fileType === "application/pdf" ? "PDF" : att.fileType}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Show PDF viewer
  return (
    <div className="h-[calc(100vh-8rem)]">
      <PdfViewer
        url={selectedAttachment.fileUrl}
        fileName={selectedAttachment.fileName}
        watermark={user?.member?.fullName || user?.name}
        onClose={() => setSelectedAttachment(null)}
        onDownload={handleDownload}
        allowDownload={true}
        allowPrint={true}
        className="rounded-lg overflow-hidden border"
      />
    </div>
  );
}

export function EBookReaderView() {
  return (
    <Suspense
      fallback={
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <EBookReaderContent />
    </Suspense>
  );
}
