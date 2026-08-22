"use client";

import { Crown, Award } from "lucide-react";
import { Card } from "@/components/ui/layout/card";
import { Badge } from "@/components/ui/data-display/badge";

interface TopItem {
  id: string;
  /** primary text (buku title / member fullName) */
  primary: string;
  /** secondary text (buku author / member memberNumber + class) */
  secondary: string;
  /** count of loans */
  count: number;
}

interface ExecutiveTopListProps {
  title: string;
  icon: "crown" | "award";
  iconColor: string;
  items: TopItem[];
  countSuffix?: string;
  emptyText?: string;
}

const CHART_COLORS = ["#1e3a5f", "#2d5a3d", "#7c4a2d", "#5a3a6b", "#8b3a3a"];

/**
 * Top list (buku atau anggota) untuk executive dashboard.
 * Komponen generik yang menerima `items` generic.
 */
export function ExecutiveTopList({
  title,
  icon,
  iconColor,
  items,
  countSuffix = "x",
  emptyText = "Belum ada data.",
}: ExecutiveTopListProps) {
  const Icon = icon === "crown" ? Crown : Award;

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon className={`h-5 w-5 ${iconColor}`} />
        <h2 className="font-semibold text-foreground">{title}</h2>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">{emptyText}</p>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={item.id} className="flex items-center gap-3">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white font-bold text-sm shrink-0"
                style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{item.primary}</p>
                <p className="text-xs text-muted-foreground truncate">{item.secondary}</p>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                {item.count}
                {countSuffix}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
