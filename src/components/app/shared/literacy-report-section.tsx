"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  Users,
  TrendingUp,
  Award,
  Printer,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useFetch } from "@/hooks/use-fetch";
import { formatDate } from "@/lib/constants";

interface LiteracyStudent {
  id: string;
  memberNumber: string;
  fullName: string;
  classGrade: string;
  booksRead: number;
  favoriteCategory: string;
}

interface ClassSummary {
  className: string;
  totalBooks: number;
  studentCount: number;
  average: number;
  topStudent: string;
  topStudentBooks: number;
  popularCategory: string;
}

interface LiteracyResult {
  students: LiteracyStudent[];
  classSummary: ClassSummary[];
  totalBooksRead: number;
  totalActiveStudents: number;
  filter: {
    classGrade: string;
    startDate: string | null;
    endDate: string | null;
  };
}

interface Settings {
  library_name?: string;
  head_librarian?: string;
}

export function LiteracyReportSection({ settings }: { settings: Settings | null }) {
  const [classGrade, setClassGrade] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<string>("");

  // Build URL dengan filter
  const literacyUrl = useMemo(() => {
    if (!activeFilter) return null;
    const params = new URLSearchParams();
    if (activeFilter !== "all") params.set("classGrade", activeFilter);
    return `/api/reports/literacy?${params.toString()}`;
  }, [activeFilter]);

  const { data: literacy, loading: literacyLoading } = useFetch<LiteracyResult>(literacyUrl);

  function handleApplyFilter() {
    // Build filter key — trigger refetch
    const parts = [classGrade || "all", startDate, endDate];
    setActiveFilter(parts.join("|"));
    // Update URL manually since useFetch doesn't support dynamic params easily
    const params = new URLSearchParams();
    if (classGrade) params.set("classGrade", classGrade);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    // Force refetch by changing the URL
    const url = `/api/reports/literacy?${params.toString()}`;
    // useFetch will refetch when literacyUrl changes
    // We need to use a different approach — use state for URL
    setLiteracyUrlState(url);
  }

  const [literacyUrlState, setLiteracyUrlState] = useState<string | null>(null);
  const { data: literacyData, loading: literacyDataLoading } = useFetch<LiteracyResult>(literacyUrlState);

  const libraryName = settings?.library_name || "Perpustakaan Jendela Ilmu";
  const headLibrarian = settings?.head_librarian || "Kepala Perpustakaan";

  function handlePrint() {
    window.print();
  }

  return (
    <Card className="print-area">
      <CardHeader className="no-print">
        <CardTitle className="text-base flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Laporan Literasi (GLS / Akreditasi)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Print header (only visible when printing) */}
        <div className="hidden print:block text-center mb-6 border-b pb-4">
          <h1 className="text-lg font-bold">{libraryName}</h1>
          <h2 className="text-sm font-semibold mt-1">Laporan Literasi Siswa</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Periode: {startDate ? formatDate(startDate) : "Awal"} s/d {endDate ? formatDate(endDate) : "Akhir"}
            {classGrade ? ` · Kelas: ${classGrade}` : " · Semua Kelas"}
          </p>
        </div>

        {/* Filter controls */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 no-print">
          <div className="space-y-1.5">
            <Label htmlFor="lit-class" className="text-xs">Kelas</Label>
            <Input
              id="lit-class"
              placeholder="cth. IX-A (kosong = semua)"
              value={classGrade}
              onChange={(e) => setClassGrade(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lit-start" className="text-xs">Tanggal Mulai</Label>
            <Input
              id="lit-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lit-end" className="text-xs">Tanggal Akhir</Label>
            <Input
              id="lit-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={handleApplyFilter} size="sm" className="gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              Terapkan
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1">
              <Printer className="h-3.5 w-3.5" />
              Cetak
            </Button>
          </div>
        </div>

        {/* Loading */}
        {literacyDataLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* No data */}
        {!literacyDataLoading && literacyData && literacyData.students.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Belum ada data literasi untuk filter ini.</p>
            <p className="text-xs mt-1">Coba ubah kelas atau rentang tanggal.</p>
          </div>
        )}

        {/* Data: summary cards + tables */}
        {!literacyDataLoading && literacyData && literacyData.students.length > 0 && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border p-3 text-center">
                <div className="text-xs text-muted-foreground">Total Buku Dibaca</div>
                <div className="text-xl font-bold text-primary">{literacyData.totalBooksRead}</div>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <div className="text-xs text-muted-foreground">Siswa Aktif</div>
                <div className="text-xl font-bold">{literacyData.totalActiveStudents}</div>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <div className="text-xs text-muted-foreground">Rata-rata/Siswa</div>
                <div className="text-xl font-bold">
                  {literacyData.totalActiveStudents > 0
                    ? (literacyData.totalBooksRead / literacyData.totalActiveStudents).toFixed(1)
                    : "0"}
                </div>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <div className="text-xs text-muted-foreground">Jumlah Kelas</div>
                <div className="text-xl font-bold">{literacyData.classSummary.length}</div>
              </div>
            </div>

            {/* Class summary table */}
            {literacyData.classSummary.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-500" />
                  Ringkasan per Kelas
                </h3>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Kelas</TableHead>
                        <TableHead className="text-xs text-right">Total Buku</TableHead>
                        <TableHead className="text-xs text-right">Siswa Aktif</TableHead>
                        <TableHead className="text-xs text-right">Rata-rata</TableHead>
                        <TableHead className="text-xs">Siswa Teraktif</TableHead>
                        <TableHead className="text-xs">Kategori Populer</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {literacyData.classSummary.map((cs) => (
                        <TableRow key={cs.className}>
                          <TableCell className="text-sm font-medium">{cs.className}</TableCell>
                          <TableCell className="text-sm text-right">{cs.totalBooks}</TableCell>
                          <TableCell className="text-sm text-right">{cs.studentCount}</TableCell>
                          <TableCell className="text-sm text-right">{cs.average}</TableCell>
                          <TableCell className="text-sm">
                            {cs.topStudent} <span className="text-xs text-muted-foreground">({cs.topStudentBooks} buku)</span>
                          </TableCell>
                          <TableCell className="text-sm">{cs.popularCategory}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Per-student table */}
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Detail per Siswa
              </h3>
              <div className="rounded-lg border overflow-hidden max-h-96 overflow-y-auto scrollbar-thin">
                <Table>
                  <TableHeader className="sticky top-0 bg-card">
                    <TableRow>
                      <TableHead className="text-xs">No</TableHead>
                      <TableHead className="text-xs">Nama</TableHead>
                      <TableHead className="text-xs">No. Anggota</TableHead>
                      <TableHead className="text-xs">Kelas</TableHead>
                      <TableHead className="text-xs text-right">Buku Dibaca</TableHead>
                      <TableHead className="text-xs">Kategori Favorit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {literacyData.students.map((s, idx) => (
                      <TableRow key={s.id}>
                        <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="text-sm font-medium">{s.fullName}</TableCell>
                        <TableCell className="text-xs font-mono">{s.memberNumber}</TableCell>
                        <TableCell className="text-sm">{s.classGrade}</TableCell>
                        <TableCell className="text-sm text-right font-semibold">{s.booksRead}</TableCell>
                        <TableCell className="text-sm">{s.favoriteCategory}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Print footer */}
            <div className="hidden print:block mt-8 text-right">
              <p className="text-sm text-muted-foreground">Dibuat oleh:</p>
              <p className="text-sm font-semibold italic mt-8" style={{ fontFamily: "Georgia, serif" }}>
                {headLibrarian}
              </p>
              <p className="text-xs text-muted-foreground">Kepala Perpustakaan</p>
            </div>
          </>
        )}

        {/* Initial state (belum klik Terapkan) */}
        {!literacyData && !literacyDataLoading && (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Pilih kelas dan rentang tanggal, lalu klik "Terapkan" untuk melihat data literasi.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
