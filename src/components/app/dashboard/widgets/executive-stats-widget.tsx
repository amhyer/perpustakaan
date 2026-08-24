"use client";

import {
  BookOpen,
  Users,
  AlertTriangle,
  Footprints,
} from "lucide-react";
import { Card } from "@/components/ui/layout/card";
import { useFetch } from "@/hooks/use-fetch";

interface ExecutiveStats {
  studentsReadingToday: number;
  topBooks: { bookId: string; title: string; author: string; loanCount: number }[];
  outstandingFines: { total: number };
  visitorCount: number;
}

function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

export function ExecutiveStatsWidget() {
  const { data: stats, loading } = useFetch<ExecutiveStats>("/api/dashboard/executive-stats");

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-5">
            <div className="h-20 bg-muted rounded animate-pulse" />
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      icon: Users,
      color: "bg-blue-100 text-blue-700",
      value: stats.studentsReadingToday,
      label: "Siswa Membaca Hari Ini",
    },
    {
      icon: BookOpen,
      color: "bg-amber-100 text-amber-700",
      value: stats.topBooks[0]?.title || "-",
      label: "Buku Terpopuler",
      subtitle: stats.topBooks[0] ? `${stats.topBooks[0].loanCount}x dipinjam` : undefined,
    },
    {
      icon: AlertTriangle,
      color: "bg-red-100 text-red-700",
      value: formatRupiah(stats.outstandingFines.total),
      label: "Denda Belum Dibayar",
    },
    {
      icon: Footprints,
      color: "bg-emerald-100 text-emerald-700",
      value: stats.visitorCount,
      label: "Kunjungan Perpustakaan Hari Ini",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <Card key={i} className="p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="space-y-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {card.label}
                </p>
                <p className="text-2xl font-bold text-foreground truncate">
                  {card.value}
                </p>
                {card.subtitle && (
                  <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                )}
              </div>
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${card.color}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
