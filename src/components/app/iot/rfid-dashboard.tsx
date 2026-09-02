"use client";

/**
 * RFID Dashboard — Real-time monitoring untuk RFID system.
 *
 * Features:
 * - Live event log (auto-refresh every 5s)
 * - Reader status (online/offline, battery)
 * - Today's stats (check-ins, checkouts, denied)
 * - Top members (most active)
 * - Quick actions (view events, manage readers)
 *
 * Digunakan oleh pustakawan untuk monitor aktivitas IoT real-time.
 */

import { useEffect, useState, useCallback } from "react";
import {
  Radio,
  Users,
  BookOpen,
  XCircle,
  Wifi,
  WifiOff,
  Battery,
  TrendingUp,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/layout/card";
import { Badge } from "@/components/ui/data-display/badge";
import { cn } from "@/lib/utils";

interface RFIDStats {
  today: {
    totalScans: number;
    checkIns: number;
    checkouts: number;
    uniqueMembers: number;
    denied: number;
  };
  readers: {
    online: number;
    offline: number;
    total: number;
  };
  topMembers: { memberNumber: string; fullName: string; scanCount: number }[];
}

interface Reader {
  id: string;
  code: string;
  name: string;
  type: string;
  isOnline: boolean;
  lastSeenAt: string | null;
  batteryLevel: number | null;
}

export function RFIDDashboard() {
  const [stats, setStats] = useState<RFIDStats | null>(null);
  const [readers, setReaders] = useState<Reader[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [statsRes, readersRes] = await Promise.all([
        fetch("/api/rfid/stats").then((r) => r.json()),
        fetch("/api/rfid/readers").then((r) => r.json()),
      ]);
      setStats(statsRes);
      setReaders(readersRes.items || []);
    } catch (e) {
      console.error("Failed to load RFID stats:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5_000); // Refresh every 5s
    return () => clearInterval(interval);
  }, [load]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-20 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<Activity className="h-4 w-4" />}
          label="Total Scan Hari Ini"
          value={stats?.today.totalScans ?? 0}
          color="blue"
        />
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Check-in"
          value={stats?.today.checkIns ?? 0}
          color="green"
        />
        <StatCard
          icon={<BookOpen className="h-4 w-4" />}
          label="Check-out Buku"
          value={stats?.today.checkouts ?? 0}
          color="purple"
        />
        <StatCard
          icon={<XCircle className="h-4 w-4" />}
          label="Ditolak"
          value={stats?.today.denied ?? 0}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Readers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Radio className="h-5 w-5" />
              Readers
              <Badge variant="outline" className="ml-auto">
                {stats?.readers.online ?? 0} / {stats?.readers.total ?? 0} online
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {readers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Belum ada reader terdaftar
              </p>
            ) : (
              <ul className="space-y-2">
                {readers.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {r.isOnline ? (
                        <Wifi className="h-4 w-4 text-green-600" />
                      ) : (
                        <WifiOff className="h-4 w-4 text-gray-400" />
                      )}
                      <div>
                        <div className="text-sm font-medium">{r.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.code} · {r.type}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.batteryLevel !== null && (
                        <Badge
                          variant={r.batteryLevel < 20 ? "destructive" : "outline"}
                          className="text-[10px]"
                        >
                          <Battery className="h-3 w-3 mr-0.5" />
                          {r.batteryLevel}%
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {r.lastSeenAt
                          ? new Date(r.lastSeenAt).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Top members */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5" />
              Top Members Hari Ini
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.topMembers.length === 0 || !stats?.topMembers ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Belum ada scan hari ini
              </p>
            ) : (
              <ul className="space-y-2">
                {stats.topMembers.slice(0, 5).map((m, idx) => (
                  <li
                    key={m.memberNumber}
                    className="flex items-center gap-3 p-2 border rounded"
                  >
                    <div
                      className={cn(
                        "h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold",
                        idx === 0
                          ? "bg-amber-100 text-amber-700"
                          : idx === 1
                          ? "bg-slate-100 text-slate-700"
                          : idx === 2
                          ? "bg-orange-100 text-orange-700"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{m.fullName}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {m.memberNumber}
                      </div>
                    </div>
                    <Badge variant="secondary">{m.scanCount}x</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "blue" | "green" | "purple" | "red";
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    green: "bg-green-50 text-green-600 border-green-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
    red: "bg-red-50 text-red-600 border-red-200",
  };
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div
            className={cn(
              "h-8 w-8 rounded-lg flex items-center justify-center border",
              colorMap[color]
            )}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
