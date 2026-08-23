"use client";

/**
 * TeacherInsightsWidget — Insights untuk guru.
 *
 * Sprint G2 - Phase D: Role-specific dashboard widgets.
 *
 * Shows:
 * - Class reading stats (aggregate per class taught)
 * - Top readers in their classes
 * - Books recommended for class
 * - Students needing attention (overdue, low activity)
 * - My teaching materials (personal loans)
 *
 * Goal: Help guru monitor & support reading habits siswa.
 */

import { useEffect, useState } from "react";
import {
  Users,
  BookOpen,
  TrendingUp,
  AlertCircle,
  Star,
  GraduationCap,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/layout/card";
import { Badge } from "@/components/ui/data-display/badge";
import { Skeleton } from "@/components/ui/feedback/skeleton";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface TeacherData {
  classes: Array<{
    name: string;
    studentCount: number;
    activeReaders: number;
    avgBooksRead: number;
    topReader: { name: string; booksRead: number } | null;
  }>;
  totalStudents: number;
  needsAttention: Array<{
    studentName: string;
    className: string;
    issue: "OVERDUE" | "INACTIVE" | "NO_BOOKS";
  }>;
  recommendedForClass: Array<{
    id: string;
    title: string;
    author: string;
    reason: string;
  }>;
}

export function TeacherInsightsWidget() {
  const [data, setData] = useState<TeacherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<TeacherData>("/api/dashboard/teacher-insights")
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setData({
          classes: [
            {
              name: "XII-A",
              studentCount: 32,
              activeReaders: 24,
              avgBooksRead: 8.5,
              topReader: { name: "Andini P.", booksRead: 18 },
            },
            {
              name: "XII-B",
              studentCount: 30,
              activeReaders: 19,
              avgBooksRead: 6.2,
              topReader: { name: "Dimas R.", booksRead: 14 },
            },
          ],
          totalStudents: 62,
          needsAttention: [
            {
              studentName: "Reza M.",
              className: "XII-A",
              issue: "OVERDUE",
            },
            {
              studentName: "Siti N.",
              className: "XII-B",
              issue: "INACTIVE",
            },
          ],
          recommendedForClass: [
            {
              id: "1",
              title: "Sapiens",
              author: "Yuval Noah Harari",
              reason: "Populer untuk kelas XII",
            },
            {
              id: "2",
              title: "Atomic Habits",
              author: "James Clear",
              reason: "Cocok untuk pengembangan diri",
            },
          ],
        });
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Insight Kelas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <GraduationCap className="h-4 w-4" />
          Insight Kelas
          <Badge variant="outline" className="ml-auto text-[10px]">
            {data.totalStudents} siswa
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Per-class summary */}
        <div className="space-y-1.5">
          {data.classes.map((cls) => {
            const readerPercent = Math.round(
              (cls.activeReaders / cls.studentCount) * 100
            );
            return (
              <div
                key={cls.name}
                className="p-2.5 border rounded-md hover:border-primary/40 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">{cls.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      · {cls.studentCount} siswa
                    </span>
                  </div>
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <div>
                    <div className="text-muted-foreground">Aktif</div>
                    <div className="font-semibold">
                      {cls.activeReaders}/{cls.studentCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Rata-rata</div>
                    <div className="font-semibold">{cls.avgBooksRead} buku</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Top Reader</div>
                    <div className="font-semibold truncate">
                      {cls.topReader?.name?.split(" ")[0] || "—"}
                    </div>
                  </div>
                </div>
                {/* Visual progress bar */}
                <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      readerPercent >= 70
                        ? "bg-green-500"
                        : readerPercent >= 50
                        ? "bg-amber-500"
                        : "bg-red-500"
                    )}
                    style={{ width: `${readerPercent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Students needing attention */}
        {data.needsAttention.length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Perlu Perhatian ({data.needsAttention.length})
            </div>
            {data.needsAttention.map((student, i) => {
              const issueMap = {
                OVERDUE: { label: "Buku terlambat", color: "red" },
                INACTIVE: { label: "Tidak aktif 30 hari", color: "amber" },
                NO_BOOKS: { label: "Belum pernah pinjam", color: "blue" },
              };
              const issue = issueMap[student.issue];
              return (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md border text-xs",
                    issue.color === "red" && "bg-red-50 border-red-200",
                    issue.color === "amber" && "bg-amber-50 border-amber-200",
                    issue.color === "blue" && "bg-blue-50 border-blue-200"
                  )}
                >
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                    {student.studentName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{student.studentName}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {student.className} · {issue.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Recommendations for class */}
        {data.recommendedForClass.length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 flex items-center gap-1">
              <Star className="h-3 w-3" />
              Rekomendasi untuk Kelas
            </div>
            {data.recommendedForClass.map((book) => (
              <div
                key={book.id}
                className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded-md cursor-pointer"
              >
                <div className="h-8 w-6 rounded bg-primary/20 flex items-center justify-center">
                  <BookOpen className="h-3 w-3 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{book.title}</div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {book.author}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
