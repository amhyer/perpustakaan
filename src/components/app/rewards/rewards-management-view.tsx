"use client";

/**
 * RewardsManagementView — Dashboard pustakawan untuk manage reward system.
 * Tabs: Approval Queue | Katalog | Scan & Deliver | Analytics
 */

import { useEffect, useState } from "react";
import {
  Inbox,
  Package,
  BarChart3,
  ScanLine,
  Plus,
  Edit,
  Trash2,
  RotateCcw,
  Download,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/layout/card";
import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import { Textarea } from "@/components/ui/form/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { RewardForm } from "./reward-form";
import { AdminRedeemView } from "./admin-redeem-view";

type Tab = "queue" | "catalog" | "redeem" | "analytics";

interface PendingRedemption {
  id: string;
  rewardName: string;
  rewardCategory: string;
  pointsSpent: number;
  pickupCode: string;
  memberNote: string | null;
  createdAt: string;
  member: {
    id: string;
    fullName: string;
    memberNumber: string;
    category: string;
    classGrade: string | null;
  };
  reward: { id: string; name: string; pointCost: number; category: string; stock: number | null };
  currentBalance: number;
  insufficientBalance: boolean;
  cooldownWarning: string | null;
  stockRemaining: number | null;
}

const CATEGORY_EMOJI: Record<string, string> = {
  BOOK: "📚",
  STATIONERY: "✏️",
  VOUCHER: "🎟️",
  GIFT_CARD: "🎁",
  PRIVILEGE: "👑",
  CERTIFICATE: "🎓",
  CUSTOM: "🎲",
};

export function RewardsManagementView() {
  const [tab, setTab] = useState<Tab>("queue");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="h-6 w-6" />
          Manajemen Reward
        </h1>
        <p className="text-sm text-slate-500 mt-1">Kelola klaim, katalog, dan analytics</p>
      </div>

      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto">
        {[
          { key: "queue" as const, label: "Approval Queue", icon: Inbox },
          { key: "catalog" as const, label: "Katalog", icon: Package },
          { key: "redeem" as const, label: "Scan & Deliver", icon: ScanLine },
          { key: "analytics" as const, label: "Analytics", icon: BarChart3 },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "px-4 py-2.5 text-sm flex items-center gap-1.5 transition-colors whitespace-nowrap",
                tab === t.key
                  ? "border-b-2 border-blue-600 text-blue-600 font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "queue" && <ApprovalQueueTab />}
      {tab === "catalog" && <CatalogAdminTab />}
      {tab === "redeem" && <AdminRedeemView />}
      {tab === "analytics" && <AnalyticsTab />}
    </div>
  );
}

// =========================================================================
// SUB-COMPONENT: Approval Queue
// =========================================================================
function ApprovalQueueTab() {
  const [items, setItems] = useState<PendingRedemption[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rejectTarget, setRejectTarget] = useState<PendingRedemption | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<{ items: PendingRedemption[]; pendingCount: number }>(
        "/api/redemptions/admin"
      );
      setItems(data.items);
      setPendingCount(data.pendingCount);
    } catch (err) {
      toast.error("Gagal memuat antrian klaim");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const selectAll = () => {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.id)));
  };

  const handleApprove = async (id: string) => {
    setActionLoading(true);
    try {
      await api.post(`/api/redemptions/admin/${id}/approve`, {});
      toast.success("Klaim disetujui");
      await load();
      setSelected((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyetujui");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    if (rejectReason.trim().length < 3) {
      toast.error("Alasan minimal 3 karakter");
      return;
    }
    setActionLoading(true);
    try {
      await api.post(`/api/redemptions/admin/${rejectTarget.id}/reject`, {
        reason: rejectReason,
      });
      toast.success("Klaim ditolak, poin di-refund");
      setRejectTarget(null);
      setRejectReason("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menolak");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkApprove = async () => {
    if (selected.size === 0) return;
    setActionLoading(true);
    let success = 0;
    let failed = 0;
    for (const id of selected) {
      try {
        await api.post(`/api/redemptions/admin/${id}/approve`, {});
        success++;
      } catch (e) {
        console.error("Failed to approve redemption:", e);
        failed++;
      }
    }
    if (success > 0) toast.success(`${success} klaim disetujui`);
    if (failed > 0) toast.error(`${failed} gagal`);
    setSelected(new Set());
    await load();
    setActionLoading(false);
  };

  const handleBulkReject = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Tolak ${selected.size} klaim sekaligus? Poin akan di-refund ke masing-masing siswa.`)) {
      return;
    }
    const reason = prompt("Alasan penolakan untuk semua:");
    if (!reason || reason.trim().length < 3) {
      toast.error("Alasan minimal 3 karakter");
      return;
    }
    setActionLoading(true);
    let success = 0;
    for (const id of selected) {
      try {
        await api.post(`/api/redemptions/admin/${id}/reject`, { reason });
        success++;
      } catch (e) {
        console.error("Failed to reject redemption:", e);
      }
    }
    toast.success(`${success} klaim ditolak & poin di-refund`);
    setSelected(new Set());
    await load();
    setActionLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold text-lg">Antrian Klaim</h3>
          <p className="text-sm text-slate-500">{pendingCount} klaim menunggu</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={load} variant="outline" size="sm">
            ↻ Refresh
          </Button>
          {selected.size > 0 && (
            <>
              <Button onClick={handleBulkApprove} size="sm" disabled={actionLoading}>
                ✓ Setujui {selected.size}
              </Button>
              <Button
                onClick={handleBulkReject}
                size="sm"
                variant="outline"
                className="text-red-600 border-red-300"
                disabled={actionLoading}
              >
                ✗ Tolak {selected.size}
              </Button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border rounded-xl p-4 animate-pulse">
              <div className="h-20 bg-slate-50 rounded" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-slate-500">
            <Inbox className="h-12 w-12 mx-auto text-slate-300 mb-3" />
            <p className="font-medium">Tidak ada klaim pending</p>
            <p className="text-sm mt-1">Semua klaim sudah disetujui 🎉</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center gap-2 text-sm text-slate-600 px-1">
            <input
              type="checkbox"
              checked={selected.size === items.length}
              onChange={selectAll}
              className="rounded"
            />
            <span>{selected.size} dari {items.length} dipilih</span>
          </div>

          {items.map((r) => {
            const emoji = CATEGORY_EMOJI[r.rewardCategory] || "🎁";
            const hasWarning = r.insufficientBalance || r.cooldownWarning;
            return (
              <div
                key={r.id}
                className={cn(
                  "border rounded-xl p-4",
                  hasWarning ? "border-amber-300 bg-amber-50/20" : "border-slate-200",
                  r.insufficientBalance && "border-red-300 bg-red-50/20"
                )}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(r.id)}
                    onChange={() => toggleSelect(r.id)}
                    className="mt-1 rounded"
                  />
                  <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-2xl shrink-0">
                    {emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <div className="font-semibold text-slate-900">{r.rewardName}</div>
                      <span className="text-xs text-slate-500">
                        {Math.floor((Date.now() - new Date(r.createdAt).getTime()) / 60000)} menit lalu
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs mt-2">
                      <div>
                        <div className="text-slate-500">Pemohon</div>
                        <div className="font-medium">
                          {r.member.fullName} ({r.member.memberNumber})
                        </div>
                        <div className="text-slate-500">
                          {r.member.classGrade || r.member.category}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500">Saldo Poin</div>
                        <div
                          className={cn(
                            "font-medium",
                            r.insufficientBalance ? "text-red-600" : "text-green-600"
                          )}
                        >
                          {r.currentBalance} → -{r.pointsSpent} = {r.currentBalance - r.pointsSpent}{" "}
                          {r.insufficientBalance ? "❌" : "✓"}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500">Stok</div>
                        <div className="font-medium">
                          {r.stockRemaining === null ? "Unlimited" : `${r.stockRemaining} tersisa`}
                        </div>
                      </div>
                    </div>

                    {r.memberNote && (
                      <div className="mt-2 text-xs text-slate-600 bg-white/60 rounded p-2">
                        💬 "{r.memberNote}"
                      </div>
                    )}

                    {r.insufficientBalance && (
                      <div className="mt-2 text-xs text-red-600 font-medium">⚠️ Saldo tidak cukup! Wajib ditolak.</div>
                    )}
                    {r.cooldownWarning && !r.insufficientBalance && (
                      <div className="mt-2 text-xs text-amber-600">⚠️ {r.cooldownWarning}</div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button
                      onClick={() => handleApprove(r.id)}
                      disabled={actionLoading || r.insufficientBalance}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      ✓ Setujui
                    </Button>
                    <Button
                      onClick={() => {
                        setRejectTarget(r);
                        setRejectReason("");
                      }}
                      disabled={actionLoading}
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-300"
                    >
                      ✗ Tolak
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}

      {rejectTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="p-6">
              <h3 className="font-bold text-lg mb-2">Tolak Klaim</h3>
              <p className="text-sm text-slate-600 mb-4">
                Klaim <strong>{rejectTarget.rewardName}</strong> oleh{" "}
                <strong>{rejectTarget.member.fullName}</strong>. Poin akan dikembalikan otomatis.
              </p>
              <label className="text-sm font-medium block mb-1">
                Alasan penolakan <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Mis: Stok kosong, coba bulan depan"
                rows={3}
                maxLength={500}
              />
              <div className="flex gap-2 justify-end mt-4">
                <Button variant="outline" onClick={() => setRejectTarget(null)} disabled={actionLoading}>
                  Batal
                </Button>
                <Button
                  onClick={handleReject}
                  disabled={actionLoading || rejectReason.trim().length < 3}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {actionLoading ? "Memproses..." : "Tolak & Refund"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// SUB-COMPONENT: Catalog Admin (CRUD lengkap)
// =========================================================================
function CatalogAdminTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<{ items: any[] }>("/api/rewards?pageSize=60");
      setItems(data.items);
    } catch (e) {
      console.error("Failed to load reward catalog:", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Nonaktifkan hadiah "${name}"? History klaim siswa akan tetap tersimpan.`)) return;
    try {
      await api.delete(`/api/rewards/admin/${id}`);
      toast.success("Hadiah dinonaktifkan");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal");
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      await api.patch(`/api/rewards/admin/${id}`, { isActive: true });
      toast.success("Hadiah diaktifkan kembali");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal");
    }
  };

  const filtered = items
    .filter((i) => (showInactive ? true : i.isActive))
    .filter((i) => !search || i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-1">
          <Input
            placeholder="Cari hadiah..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Tampilkan non-aktif
          </label>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Hadiah
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-3 animate-pulse">
              <div className="h-16 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((r) => {
            const emoji = CATEGORY_EMOJI[r.category] || "🎁";
            const remaining = r.stock === null ? null : (r.stock || 0) - r.stockClaimed;
            const lowStock = r.stock !== null && remaining !== null && remaining <= 3;
            return (
              <div
                key={r.id}
                className={cn(
                  "border rounded-lg p-3 flex items-center gap-3",
                  !r.isActive && "opacity-60 bg-slate-50"
                )}
              >
                <div className="text-3xl shrink-0">{emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{r.name}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-1 flex-wrap">
                    <span>⭐ {r.pointCost}</span>
                    {r.requiresApproval && (
                      <span className="text-purple-600">• Approval</span>
                    )}
                    {r.stock !== null && (
                      <span className={cn(lowStock && "text-amber-600 font-semibold")}>
                        • Stok: {remaining}/{r.stock}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!r.isActive ? (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleReactivate(r.id)}
                      title="Aktifkan kembali"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditing(r)}
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(r.id, r.name)}
                        title="Nonaktifkan"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form modal */}
      {(creating || editing) && (
        <RewardForm
          initial={editing}
          onSuccess={() => {
            setCreating(false);
            setEditing(null);
            load();
          }}
          onCancel={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

// =========================================================================
// SUB-COMPONENT: Analytics
// =========================================================================
function AnalyticsTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/api/rewards/analytics")
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const downloadCsv = (type: "leaderboard" | "redemptions" | "transactions") => {
    // Trigger download via anchor
    const url = `/api/rewards/analytics/export?type=${type}`;
    window.open(url, "_blank");
  };

  if (loading) return <div className="text-center py-8">Loading analytics...</div>;
  if (!data) return <div className="text-center py-8 text-red-500">Gagal memuat analytics</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2 flex-wrap">
        <span className="text-sm text-slate-500">📥 Export:</span>
        <Button size="sm" variant="outline" onClick={() => downloadCsv("leaderboard")}>
          <Download className="h-3 w-3 mr-1" />
          Leaderboard
        </Button>
        <Button size="sm" variant="outline" onClick={() => downloadCsv("redemptions")}>
          <Download className="h-3 w-3 mr-1" />
          Klaim
        </Button>
        <Button size="sm" variant="outline" onClick={() => downloadCsv("transactions")}>
          <Download className="h-3 w-3 mr-1" />
          Transaksi
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-slate-500 mb-1">💰 Poin Beredar</div>
            <div className="text-2xl font-bold">{data.kpis.totalCirculation.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-slate-500 mb-1">📈 Poin Masuk Bulan Ini</div>
            <div className="text-2xl font-bold">{data.kpis.monthEarn.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-slate-500 mb-1">🎁 Klaim Bulan Ini</div>
            <div className="text-2xl font-bold">{data.kpis.monthRedemptions}</div>
          </CardContent>
        </Card>
        <Card className={data.kpis.lowStockCount > 0 ? "border-amber-300 bg-amber-50/30" : ""}>
          <CardContent className="p-4">
            <div className="text-xs text-amber-700 mb-1">⚠️ Stok Hampir Habis</div>
            <div className="text-2xl font-bold text-amber-700">{data.kpis.lowStockCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <h4 className="font-semibold mb-3">🏆 Top 10 Leaderboard</h4>
          <div className="space-y-2">
            {data.leaderboard.map((entry: any) => (
              <div
                key={entry.member.id}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-lg",
                  entry.rank === 1 && "bg-gradient-to-r from-amber-50 to-yellow-50",
                  entry.rank === 2 && "bg-slate-50",
                  entry.rank === 3 && "bg-orange-50"
                )}
              >
                <div
                  className={cn(
                    "w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0",
                    entry.rank === 1 && "bg-amber-400",
                    entry.rank === 2 && "bg-slate-400",
                    entry.rank === 3 && "bg-orange-400",
                    entry.rank > 3 && "bg-slate-200 text-slate-600"
                  )}
                >
                  {entry.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{entry.member.fullName}</div>
                  <div className="text-xs text-slate-500">
                    {entry.member.classGrade || entry.member.category}
                  </div>
                </div>
                <div className="font-bold text-amber-700 shrink-0">
                  {entry.balance.toLocaleString()} ⭐
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {data.topRewards?.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-semibold mb-3">🔥 Hadiah Terlaris</h4>
            <div className="space-y-3">
              {data.topRewards.map((r: any, idx: number) => {
                const max = data.topRewards[0].claimCount;
                return (
                  <div key={r.id}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">
                        {CATEGORY_EMOJI[r.category] || "🎁"} {r.name}
                      </span>
                      <span className="text-slate-500">{r.claimCount} klaim</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${(r.claimCount / max) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {data.lowStock.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/30">
          <CardContent className="p-4">
            <h4 className="font-semibold text-amber-900 mb-2">⚠️ Stok Hampir Habis</h4>
            <div className="space-y-1.5 text-sm">
              {data.lowStock.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between">
                  <span>
                    {CATEGORY_EMOJI[r.category] || "🎁"} {r.name}
                  </span>
                  <span className="text-amber-700 font-semibold">
                    {r.remaining} / {r.stock} tersisa
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
