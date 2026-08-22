"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/layout/card";
import type { CategoryStat } from "./types";

const PIE_COLORS = ["#3b5b8c", "#4a7c59", "#c99544", "#5a8fa6", "#8b5a9e", "#a64a4a", "#6b7280"];

function CategoryTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { name: string; count: number } }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0];
  return (
    <div
      className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md text-xs"
      role="tooltip"
    >
      <p className="font-medium text-foreground">{p.name}</p>
      <p className="text-muted-foreground mt-0.5">
        Total: <span className="font-semibold text-primary">{p.payload.count}</span> peminjaman
      </p>
    </div>
  );
}

interface CategoryDonutChartProps {
  data: CategoryStat[];
  title?: string;
  description?: string;
  height?: number;
  className?: string;
}

/**
 * Donut chart distribusi peminjaman per kategori buku.
 *
 * Dipakai oleh:
 * - DashboardView (default slot)
 *
 * Accessibility:
 * - Chart punya summary text untuk screen reader
 * - Empty state pakai role="status" agar diumumkan
 */
export function CategoryDonutChart({
  data,
  title = "Peminjaman per Kategori",
  description = "Distribusi peminjaman berdasarkan kategori buku",
  height = 256,
  className,
}: CategoryDonutChartProps) {
  const total = data.reduce((s, c) => s + c.count, 0) || 1;

  // Summary untuk screen reader — list kategori dengan jumlah & %
  const summary = data.length === 0
    ? "Belum ada data kategori."
    : data
        .slice(0, 5)
        .map((d) => `${d.name}: ${d.count} (${Math.round((d.count / total) * 100)}%)`)
        .join(", ");

  return (
    <Card className={className}>
      <CardHeader className="space-y-0">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div
            className="flex items-center justify-center text-sm text-muted-foreground"
            style={{ height }}
            role="status"
          >
            Belum ada data kategori
          </div>
        ) : (
          <>
            {/* sr-only summary untuk screen reader */}
            <p className="sr-only">
              {title}. {data.length} kategori. {summary}
            </p>
            <div
              className="w-full"
              style={{ height }}
              role="img"
              aria-label={`${title}. ${data.length} kategori, total ${total} peminjaman. ${summary}`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                  >
                    {data.map((_, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                        stroke="hsl(var(--background))"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CategoryTooltip />} />
                  <Legend
                    layout="horizontal"
                    align="center"
                    verticalAlign="bottom"
                    iconType="circle"
                    formatter={(value, _entry, idx) => {
                      const item = data[idx as number];
                      const count = item?.count ?? 0;
                      const pct = Math.round((count / total) * 100);
                      return (
                        <span className="text-[11px] text-muted-foreground">
                          {value} ({count} · {pct}%)
                        </span>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
