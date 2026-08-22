"use client";

import { TrendingUp } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/layout/card";
import { Button } from "@/components/ui/form/button";
import type { TrendItem } from "./types";

const CHART_COLORS = ["#3b5b8c", "#4a7c59", "#c99544", "#5a8fa6", "#8b5a9e"];

function TrendTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; name?: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md text-xs"
      role="tooltip"
    >
      <p className="font-medium text-foreground">{label}</p>
      <p className="text-muted-foreground mt-0.5">
        Peminjaman: <span className="font-semibold text-primary">{payload[0].value}</span>
      </p>
    </div>
  );
}

interface TrendAreaChartProps {
  data: TrendItem[];
  title?: string;
  description?: string;
  onViewAll?: () => void;
  viewAllLabel?: string;
  height?: number;
  className?: string;
}

/**
 * Area chart tren peminjaman.
 *
 * Dipakai oleh:
 * - DashboardView (default 7 hari)
 * - CustomizableDashboardView (widget 'chart-trend')
 *
 * Accessibility:
 * - Chart punya aria-label dari title + description (untuk screen reader)
 * - Tooltip diberikan role="tooltip" eksplisit
 * - Icon di-hidden dari screen reader
 * - Recharts SVG secara default sudah expose data points ke ARIA
 */
export function TrendAreaChart({
  data,
  title = "Tren Peminjaman 7 Hari",
  description = "Jumlah peminjaman per hari selama 7 hari terakhir",
  onViewAll,
  viewAllLabel,
  height = 256,
  className,
}: TrendAreaChartProps) {
  // Summary text untuk screen reader — chart visual tidak bisa diakses
  // oleh screen reader, jadi kita tambahkan deskripsi data sebagai fallback.
  const totalLoans = data.reduce((sum, d) => sum + d.count, 0);
  const maxLoans = data.reduce((max, d) => Math.max(max, d.count), 0);
  const summary = `${data.length} hari data, total ${totalLoans} peminjaman, tertinggi ${maxLoans} per hari.`;

  return (
    <Card className={className}>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
            {title}
          </CardTitle>
          <CardDescription className="text-xs">{description}</CardDescription>
        </div>
        {onViewAll && viewAllLabel && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewAll}
            aria-label={`Lihat semua ${title.toLowerCase()}`}
          >
            {viewAllLabel}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {/* sr-only summary untuk screen reader — chart SVG sulit diakses */}
        <p className="sr-only">{summary}</p>
        <div
          className="w-full"
          style={{ height }}
          role="img"
          aria-label={`${title}. ${description}. ${summary}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<TrendTooltip />} />
              <Area
                type="monotone"
                dataKey="count"
                name="Peminjaman"
                stroke={CHART_COLORS[0]}
                strokeWidth={2.5}
                fill="url(#trendFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
