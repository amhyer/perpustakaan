"use client";

import { useState } from "react";
import {
  BookMarked,
  Search,
  ShieldAlert,
  Users,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
  BookOpen,
} from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/layout/card";
import { Input } from "@/components/ui/form/input";
import { Button } from "@/components/ui/form/button";
import { Badge } from "@/components/ui/data-display/badge";
import { PageHeader, EmptyState } from "@/components/app/shared/page-header";
import { StatCard } from "@/components/app/shared/stat-card";
import { useFetch } from "@/hooks/use-fetch";
import { useAppStore } from "@/store/use-app-store";
import { BookCover } from "@/components/app/shared/book-cover";
import {
  ROLE_LABELS,
  ROLE_COLORS,
  formatDateShort,
} from "@/lib/constants";

interface QueueBook {
  book: {
    id: string;
    title: string;
    author: string;
    coverColor: string;
    coverImage: string | null;
    isbn: string | null;
  };
  pendingCount: number;
  readyCount: number;
  totalWaiting: number;
  availableCopies: number;
  pending: {
    id: string;
    queueOrder: number;
    createdAt: string;
    member: {
      id: string;
      memberNumber: string;
      fullName: string;
      category: string;
      classGrade: string | null;
    };
  }[];
  ready: {
    id: string;
    expiresAt: string | null;
    createdAt: string;
    member: {
      id: string;
      memberNumber: string;
      fullName: string;
      category: string;
      classGrade: string | null;
    };
  }[];
}

interface QueueData {
  queue: QueueBook[];
  stats: {
    totalWaiting: number;
    booksWithQueues: number;
    highDemand: number;
  };
}

export function ReservationsQueueView() {
  const user = useAppStore((s) => s.user);
  const [search, setSearch] = useState("");
  const [expandedBooks, setExpandedBooks] = useState<Set<string>>(new Set());

  if (user?.role !== "LIBRARIAN") {
    return (
      <Card className="p-6">
        <EmptyState
          icon={ShieldAlert}
          title="Akses Ditolak"
          description="Halaman ini hanya tersedia untuk pustakawan."
        />
      </Card>
    );
  }

  const { data, loading } = useFetch<QueueData>(
    "/api/reservations/queue",
    {}
  );

  const stats = data?.stats ?? { totalWaiting: 0, booksWithQueues: 0, highDemand: 0 };
  const queue = data?.queue ?? [];

  const filtered = search
    ? queue.filter(
        (q) =>
          q.book.title.toLowerCase().includes(search.toLowerCase()) ||
          q.book.author.toLowerCase().includes(search.toLowerCase())
      )
    : queue;

  function toggleExpand(bookId: string) {
    setExpandedBooks((prev) => {
      const next = new Set(prev);
      if (next.has(bookId)) next.delete(bookId);
      else next.add(bookId);
      return next;
    });
  }

  return (
    <div>
      <PageHeader
        title="Antrian Reservasi"
        description="Daftar buku yang menunggu diambil atau sedang diantri"
        icon={BookMarked}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={Users}
          label="Total Menunggu"
          value={stats.totalWaiting}
          color="blue"
        />
        <StatCard
          icon={BookOpen}
          label="Buku Diantri"
          value={stats.booksWithQueues}
          color="violet"
        />
        <StatCard
          icon={AlertTriangle}
          label="High Demand"
          value={stats.highDemand}
          color="red"
        />
      </div>

      <Card className="p-0">
        <div className="border-b px-4 pt-4 pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari judul atau pengarang..."
              className="pl-9"
            />
          </div>
        </div>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={BookMarked}
              title="Tidak ada antrian"
              description="Belum ada buku yang diantri oleh anggota."
            />
          ) : (
            <div className="divide-y">
              {filtered.map((item) => {
                const isExpanded = expandedBooks.has(item.book.id);
                const isHighDemand = item.availableCopies === 0 && item.totalWaiting > 0;
                return (
                  <div key={item.book.id} className="px-4 py-3">
                    <div
                      className="flex items-start gap-3 cursor-pointer"
                      onClick={() => toggleExpand(item.book.id)}
                    >
                      <div className="w-10 shrink-0">
                        <BookCover
                          title={item.book.title}
                          author={item.book.author}
                          color={item.book.coverColor}
                          coverImage={item.book.coverImage}
                          size="sm"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm line-clamp-1">
                          {item.book.title}
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {item.book.author}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {item.pendingCount > 0 && (
                            <Badge className="bg-blue-100 text-blue-700 border-blue-200" variant="outline">
                              <Clock className="h-3 w-3 mr-1" />
                              {item.pendingCount} mengantre
                            </Badge>
                          )}
                          {item.readyCount > 0 && (
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200" variant="outline">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              {item.readyCount} siap diambil
                            </Badge>
                          )}
                          <Badge
                            className={
                              item.availableCopies > 0
                                ? "bg-muted text-muted-foreground"
                                : "bg-red-100 text-red-700 border-red-200"
                            }
                            variant="outline"
                          >
                            {item.availableCopies} tersedia
                          </Badge>
                          {isHighDemand && (
                            <Badge variant="destructive" className="text-[10px]">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              High Demand
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-muted-foreground">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 ml-13 space-y-2">
                        {item.ready.length > 0 && (
                          <div>
                            <div className="text-[11px] font-medium text-muted-foreground mb-1">
                              Siap Diambil ({item.ready.length})
                            </div>
                            {item.ready.map((r) => (
                              <div
                                key={r.id}
                                className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900 px-3 py-2 mb-1"
                              >
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">
                                  {r.member.fullName.charAt(0)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-medium truncate">
                                    {r.member.fullName}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground">
                                    {r.member.memberNumber}
                                    {r.member.classGrade ? ` · ${r.member.classGrade}` : ""}
                                  </div>
                                </div>
                                <Badge className={ROLE_COLORS[r.member.category] ?? ""} variant="outline">
                                  {ROLE_LABELS[r.member.category] ?? r.member.category}
                                </Badge>
                                {r.expiresAt && (
                                  <span className="text-[10px] text-muted-foreground">
                                    Exp: {formatDateShort(r.expiresAt)}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {item.pending.length > 0 && (
                          <div>
                            <div className="text-[11px] font-medium text-muted-foreground mb-1">
                              Mengantre ({item.pending.length})
                            </div>
                            {item.pending.map((r) => (
                              <div
                                key={r.id}
                                className="flex items-center gap-2 rounded-lg border px-3 py-2 mb-1"
                              >
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                                  {r.queueOrder}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-medium truncate">
                                    {r.member.fullName}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground">
                                    {r.member.memberNumber}
                                    {r.member.classGrade ? ` · ${r.member.classGrade}` : ""}
                                  </div>
                                </div>
                                <Badge className={ROLE_COLORS[r.member.category] ?? ""} variant="outline">
                                  {ROLE_LABELS[r.member.category] ?? r.member.category}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">
                                  {formatDateShort(r.createdAt)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
