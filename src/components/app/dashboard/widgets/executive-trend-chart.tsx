"use client";

import { BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/layout/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface MonthlyTrend {
  month: string;
  loans: number;
  members: number;
  visitors: number;
}

interface ExecutiveTrendChartProps {
  data: MonthlyTrend[];
  height?: number;
}

const CHART_COLORS = ["#1e3a5f", "#2d5a3d", "#7c4a2d", "#5a3a6b", "#8b3a3a"];

/**
 * Line chart 12-bulan untuk executive dashboard.
 * Menampilkan 3 metric: peminjaman, anggota baru, kunjungan.
 */
export function ExecutiveTrendChart({ data, height = 288 }: ExecutiveTrendChartProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h2 className="font-semibold text-foreground">Tren 12 Bulan Terakhir</h2>
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255,255,255,0.95)",
                border: "1px solid #ddd",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="loans"
              stroke={CHART_COLORS[0]}
              strokeWidth={2}
              name="Peminjaman"
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="members"
              stroke={CHART_COLORS[1]}
              strokeWidth={2}
              name="Anggota Baru"
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="visitors"
              stroke={CHART_COLORS[2]}
              strokeWidth={2}
              name="Kunjungan"
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
