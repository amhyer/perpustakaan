"use client";

/**
 * MyRedemptionsView — Riwayat klaim hadiah oleh member.
 * Tabs: Semua | Pending | Disetujui | Selesai | Ditolak
 */

import { useEffect, useState } from "react";
import { Clock, Check, X, Package, Copy, MapPin, AlertCircle } from "lucide-react";
import { api } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/layout/card";
import { Button } from "@/components/ui/form/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RedemptionItem {
  id: string;
  rewardName: string;
  rewardCategory: string;
  pointsSpent: number;
  status: "PENDING" | "APPROVED" | "DELIVERED" | "REJECTED" | "CANCELLED";
  pickupCode: string;
  memberNote: string | null;
  rejectionReason: string | null;
  staffNote: string | null;
  createdAt: string;
  approvedAt: string | null;
  deliveredAt: string | null;
  reward: { id: string; name: string; imageUrl: string | null; category: string };
  approvedBy: { id: string; name: string } | null;
  deliveredBy: { id: string; name: string } | null;
}

interface Counts {
  PENDING: number;
  APPROVED: number;
  DELIVERED: number;
  REJECTED: number;
  CANCELLED: number;
}

const TABS = [
  { key: "all", label: "Semua" },
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Disetujui" },
  { key: "DELIVERED", label: "Selesai" },
  { key: "REJECTED", label: "Ditolak" },
];

const CATEGORY_EMOJI: Record<string, string> = {
  BOOK: "📚",
  STATIONERY: "✏️",
  VOUCHER: "🎟️",
  GIFT_CARD: "🎁",
  PRIVILEGE: "👑",
  CERTIFICATE: "🎓",
  CUSTOM: "🎲",
};

export function MyRedemptionsView() {
  const [items, setItems] = useState<RedemptionItem[]>([]);
  const [counts, setCounts] = useState<Counts>({
    PENDING: 0, APPROVED: 0, DELIVERED: 0, REJECTED: 0, CANCELLED: 0,
  });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tab !== "all") params.set("status", tab);
      const data = await api.get<{ items: RedemptionItem[]; counts: Counts }>(
        `/api/redemptions/me?${params.toString()}`
      );
      setItems(data.items);
      setCounts(data.counts);
    } catch (err) {
      toast.error("Gagal memuat riwayat klaim");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const copyPickupCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Kode disalin!");
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="h-6 w-6" />
          Klaim Hadiah Saya
        </h1>
        <p className="text-sm text-slate-500 mt-1">Pantau status klaim hadiahmu</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto">
        {TABS.map((t) => {
          const count =
            t.key === "all"
              ? Object.values(counts).reduce((s, c) => s + c, 0)
              : counts[t.key as keyof Counts] || 0;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "px-4 py-2.5 text-sm whitespace-nowrap transition-colors flex items-center gap-1.5",
                tab === t.key
                  ? "border-b-2 border-blue-600 text-blue-600 font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              {t.label}
              <span className="bg-slate-100 text-slate-600 text-xs px-1.5 py-0.5 rounded-full">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border border-slate-200 rounded-xl p-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-slate-100 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 bg-slate-100 rounded" />
                  <div className="h-3 w-24 bg-slate-100 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-slate-500">
            <Package className="h-12 w-12 mx-auto text-slate-300 mb-3" />
            <p className="font-medium">Belum ada klaim</p>
            <p className="text-sm mt-1">Mulai baca buku untuk kumpulkan poin, lalu tukar dengan hadiah!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((r) => {
            const emoji = CATEGORY_EMOJI[r.rewardCategory] || "🎁";
            return (
              <div
                key={r.id}
                className={cn(
                  "border rounded-xl p-4",
                  r.status === "APPROVED" && "border-2 border-green-300 bg-green-50/30",
                  r.status === "PENDING" && "border-amber-200",
                  r.status === "DELIVERED" && "border-slate-200 bg-slate-50/30",
                  r.status === "REJECTED" && "border-red-200 bg-red-50/30"
                )}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      "w-16 h-16 rounded-lg flex items-center justify-center text-3xl shrink-0",
                      r.status === "DELIVERED" && "opacity-50"
                    )}
                  >
                    {emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <div
                        className={cn(
                          "font-semibold",
                          r.status === "REJECTED" && "line-through opacity-60"
                        )}
                      >
                        {r.rewardName}
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="text-xs text-slate-500">
                      {r.pointsSpent} poin • Diajukan {formatDate(r.createdAt)}
                    </div>
                    {r.memberNote && (
                      <div className="text-xs text-slate-600 italic mt-1">
                        💬 "{r.memberNote}"
                      </div>
                    )}
                    {r.rejectionReason && (
                      <div className="text-xs text-red-600 italic mt-1 flex items-start gap-1">
                        <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                        <span>Alasan: {r.rejectionReason}</span>
                      </div>
                    )}

                    {/* Pickup code for APPROVED */}
                    {r.status === "APPROVED" && (
                      <div className="mt-3 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-green-600" />
                        <span className="text-xs text-green-700">
                          Tunjukkan kode ini ke pustakawan:
                        </span>
                        <button
                          onClick={() => copyPickupCode(r.pickupCode)}
                          className="bg-white border-2 border-dashed border-green-500 px-3 py-1 rounded-md font-mono text-sm font-bold text-green-700 hover:bg-green-50 flex items-center gap-1"
                        >
                          {r.pickupCode}
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    )}

                    {r.status === "DELIVERED" && r.deliveredBy && (
                      <div className="text-xs text-slate-500 italic mt-1">
                        Diterima {formatDate(r.deliveredAt!)} dari {r.deliveredBy.name}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: RedemptionItem["status"] }) {
  const map = {
    PENDING: { icon: Clock, label: "⏳ Pending", className: "bg-amber-100 text-amber-700" },
    APPROVED: { icon: Check, label: "✅ Disetujui", className: "bg-green-100 text-green-700" },
    DELIVERED: { icon: Check, label: "✓ Selesai", className: "bg-blue-100 text-blue-700" },
    REJECTED: { icon: X, label: "✗ Ditolak", className: "bg-red-100 text-red-700" },
    CANCELLED: { icon: X, label: "Batal", className: "bg-slate-100 text-slate-600" },
  };
  const config = map[status];
  const Icon = config.icon;
  return (
    <span
      className={cn(
        "text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}
