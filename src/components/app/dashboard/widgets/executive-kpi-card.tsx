"use client";

import { type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/layout/card";
import { Badge } from "@/components/ui/data-display/badge";
import { TrendingUp, TrendingDown } from "lucide-react";

interface ExecutiveKpiCardProps {
  icon: LucideIcon;
  iconColor: string;
  value: string | number;
  label: string;
  footnote: string;
  /** Optional growth percentage. Positive = green badge, negative = red */
  growth?: number;
}

/**
 * KPI card untuk executive dashboard.
 * Komponen kecil & presentational — tidak fetch data.
 */
export function ExecutiveKpiCard({
  icon: Icon,
  iconColor,
  value,
  label,
  footnote,
  growth,
}: ExecutiveKpiCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconColor}`}>
          <Icon className="h-5 w-5" />
        </div>
        {growth !== undefined && growth !== 0 && (
          <Badge
            variant={growth > 0 ? "default" : "destructive"}
            className="text-[10px]"
          >
            {growth > 0 ? (
              <TrendingUp className="h-3 w-3 mr-0.5" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-0.5" />
            )}
            {growth > 0 ? "+" : ""}
            {growth}%
          </Badge>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground">
        {typeof value === "number" ? value.toLocaleString("id-ID") : value}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      <p className="text-[10px] text-muted-foreground mt-1">{footnote}</p>
    </Card>
  );
}
