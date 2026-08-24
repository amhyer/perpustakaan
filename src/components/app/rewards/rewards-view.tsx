"use client";

/**
 * RewardsView — Katalog hadiah untuk siswa/guru.
 * Browse, filter, klaim hadiah.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Gift, Filter, Star, Sparkles } from "lucide-react";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/store/use-app-store";
import { Card, CardContent } from "@/components/ui/layout/card";
import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import { Textarea } from "@/components/ui/form/textarea";
import { toast } from "sonner";
import { RewardCard, type RewardItem } from "./reward-card";

const CATEGORIES = [
  { key: "", label: "Semua" },
  { key: "BOOK", label: "📖 Buku" },
  { key: "STATIONERY", label: "✏️ Stationery" },
  { key: "VOUCHER", label: "🎟️ Voucher" },
  { key: "GIFT_CARD", label: "🎁 Gift Card" },
  { key: "CERTIFICATE", label: "🎓 Certificate" },
  { key: "PRIVILEGE", label: "👑 Privilege" },
  { key: "CUSTOM", label: "🎲 Custom" },
];

export function RewardsView() {
  const router = useRouter();
  const { setView } = useAppStore();
  const [items, setItems] = useState<RewardItem[]>([]);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("featured");
  const [affordableOnly, setAffordableOnly] = useState(false);
  const [search, setSearch] = useState("");

  // Modal state
  const [claimTarget, setClaimTarget] = useState<RewardItem | null>(null);
  const [memberNote, setMemberNote] = useState("");
  const [claiming, setClaiming] = useState(false);

  const loadRewards = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (affordableOnly) params.set("affordableOnly", "true");
      const data = await api.get<{ items: RewardItem[]; userBalance: number }>(
        `/api/rewards?${params.toString()}`
      );
      setItems(data.items);
      setUserBalance(data.userBalance);
    } catch (err) {
      toast.error("Gagal memuat katalog hadiah");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRewards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, affordableOnly]);

  const handleClaim = async (reward: RewardItem) => {
    setClaimTarget(reward);
    setMemberNote("");
  };

  const submitClaim = async () => {
    if (!claimTarget) return;
    setClaiming(true);
    try {
      const result = await api.post<{ pickupCode: string; newBalance: number }>(
        `/api/rewards/${claimTarget.id}/claim`,
        { memberNote: memberNote || undefined }
      );
      toast.success(
        claimTarget.requiresApproval
          ? `Klaim dikirim! Menunggu persetujuan pustakawan.`
          : `Klaim berhasil! Kode ambil: ${result.pickupCode}`,
        { duration: 6000 }
      );
      setClaimTarget(null);
      setMemberNote("");
      // Refresh data
      await loadRewards();
      // Navigate to my redemptions
      setView("my-redemptions");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Klaim gagal");
    } finally {
      setClaiming(false);
    }
  };

  // Filter & sort
  const filtered = items
    .filter((r) => !search || r.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === "asc") return a.pointCost - b.pointCost;
      if (sort === "desc") return b.pointCost - a.pointCost;
      // featured: featured first, then by cost asc
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return a.pointCost - b.pointCost;
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gift className="h-6 w-6 text-amber-500" />
            Katalog Hadiah
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Tukar poinmu dengan hadiah menarik
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5">
            <Star className="h-4 w-4 text-amber-600 fill-amber-400" />
            Poin Anda: <span className="text-amber-900">{userBalance}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-slate-200">
        <Filter className="h-4 w-4 text-slate-400" />
        <span className="text-sm text-slate-500 mr-1">Kategori:</span>
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              category === c.key
                ? "bg-blue-600 text-white"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            {c.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <Input
            placeholder="Cari hadiah..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs w-40"
          />
          <select
            value={affordableOnly ? "affordable" : sort}
            onChange={(e) => {
              if (e.target.value === "affordable") {
                setAffordableOnly(true);
                setSort("featured");
              } else {
                setAffordableOnly(false);
                setSort(e.target.value);
              }
            }}
            className="text-xs border border-slate-200 rounded-md px-2 py-1.5 h-8"
          >
            <option value="featured">Urut: Featured</option>
            <option value="asc">Poin: Rendah → Tinggi</option>
            <option value="desc">Poin: Tinggi → Rendah</option>
            <option value="affordable">💰 Bisa diklaim</option>
          </select>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="border border-slate-200 rounded-xl overflow-hidden bg-white animate-pulse">
              <div className="aspect-square bg-slate-100" />
              <div className="p-3 space-y-2">
                <div className="h-3 w-16 bg-slate-100 rounded" />
                <div className="h-4 w-full bg-slate-100 rounded" />
                <div className="h-8 w-full bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-slate-500">
            <Sparkles className="h-12 w-12 mx-auto text-slate-300 mb-3" />
            <p className="font-medium">Tidak ada hadiah ditemukan</p>
            <p className="text-sm mt-1">Coba ubah filter atau kata kunci pencarian</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filtered.map((reward) => (
            <RewardCard
              key={reward.id}
              reward={reward}
              onClaim={handleClaim}
            />
          ))}
        </div>
      )}

      {/* Claim Modal */}
      {claimTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="p-6">
              <h3 className="font-bold text-lg mb-2">Konfirmasi Klaim</h3>
              <div className="bg-slate-50 rounded-lg p-3 mb-4">
                <div className="font-semibold">{claimTarget.name}</div>
                <div className="text-xs text-slate-500 mt-1">
                  Biaya: <span className="font-bold text-amber-700">⭐ {claimTarget.pointCost} poin</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Saldo setelah klaim: <span className="font-bold">{userBalance - claimTarget.pointCost}</span>
                </div>
              </div>
              {claimTarget.requiresApproval && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-800 mb-3">
                  ⏳ Hadiah ini perlu persetujuan pustakawan. Anda akan mendapat notifikasi setelah disetujui.
                </div>
              )}
              <label className="text-xs font-medium text-slate-600 mb-1 block">
                Catatan (opsional)
              </label>
              <Textarea
                value={memberNote}
                onChange={(e) => setMemberNote(e.target.value)}
                placeholder="Mis: warna biru, ukuran L, dll"
                className="mb-4 text-sm"
                rows={2}
                maxLength={500}
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setClaimTarget(null)}
                  disabled={claiming}
                >
                  Batal
                </Button>
                <Button onClick={submitClaim} disabled={claiming}>
                  {claiming ? "Memproses..." : "Konfirmasi Klaim"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
