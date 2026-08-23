"use client";

/**
 * AdminRedeemView — Halaman untuk pustakawan scan QR / input kode ambil.
 * Lookup → tampilkan detail → konfirmasi deliver.
 */

import { useEffect, useState, useRef } from "react";
import { ScanLine, Search, Check, X, Package, User, Calendar, Hash } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/layout/card";
import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import { Textarea } from "@/components/ui/form/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Redemption {
  id: string;
  rewardName: string;
  rewardCategory: string;
  pointsSpent: number;
  status: "PENDING" | "APPROVED" | "DELIVERED" | "REJECTED" | "CANCELLED";
  pickupCode: string;
  memberNote: string | null;
  createdAt: string;
  approvedAt: string | null;
  deliveredAt: string | null;
  member: {
    id: string;
    fullName: string;
    memberNumber: string;
    category: string;
    classGrade: string | null;
    user: { email: string };
  };
  reward: { id: string; name: string; category: string; pointCost: number };
  approvedBy: { id: string; name: string } | null;
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

export function AdminRedeemView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const [code, setCode] = useState("");
  const [redemption, setRedemption] = useState<Redemption | null>(null);
  const [loading, setLoading] = useState(false);
  const [delivering, setDelivering] = useState(false);
  const [notes, setNotes] = useState("");

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-search kalau ada ?code= di URL (dari QR scan)
  useEffect(() => {
    const urlCode = searchParams.get("code");
    if (urlCode && urlCode !== code) {
      setCode(urlCode);
      handleSearch(urlCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSearch = async (codeToSearch?: string) => {
    const target = (codeToSearch ?? code).trim().toUpperCase();
    if (!target) return;

    setLoading(true);
    setRedemption(null);
    try {
      const data = await api.get<{ redemption: Redemption }>(
        `/api/redemptions/lookup?code=${encodeURIComponent(target)}`
      );
      setRedemption(data.redemption);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kode tidak ditemukan");
      setRedemption(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDeliver = async () => {
    if (!redemption) return;
    setDelivering(true);
    try {
      await api.post(`/api/redemptions/admin/${redemption.id}/deliver`, {
        notes: notes || undefined,
      });
      toast.success("Hadiah berhasil di-deliver! 🎁");
      // Clear and refocus
      setRedemption(null);
      setCode("");
      setNotes("");
      inputRef.current?.focus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal deliver");
    } finally {
      setDelivering(false);
    }
  };

  const handleReset = () => {
    setRedemption(null);
    setCode("");
    setNotes("");
    inputRef.current?.focus();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ScanLine className="h-6 w-6" />
          Scan & Deliver Hadiah
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Scan QR code dari siswa atau input kode ambil manual
        </p>
      </div>

      {/* Search input */}
      <Card>
        <CardContent className="p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                ref={inputRef}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Scan QR atau ketik kode: RWD-XXXXX"
                className="pl-10 font-mono text-base h-12"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <Button type="submit" size="lg" disabled={loading || !code.trim()}>
              {loading ? "Mencari..." : "Cari"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Result */}
      {loading ? (
        <Card>
          <CardContent className="p-12 text-center text-slate-500">
            <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
            <p className="mt-3 text-sm">Mencari kode...</p>
          </CardContent>
        </Card>
      ) : redemption ? (
        <RedemptionDetail
          redemption={redemption}
          notes={notes}
          setNotes={setNotes}
          onDeliver={handleDeliver}
          onReset={handleReset}
          delivering={delivering}
        />
      ) : (
        <Card>
          <CardContent className="p-12 text-center text-slate-400">
            <ScanLine className="h-16 w-16 mx-auto mb-3 text-slate-200" />
            <p className="font-medium">Belum ada kode di-scan</p>
            <p className="text-sm mt-1">
              Arahkan kamera ke QR code siswa, atau ketik kode manual di atas
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// =========================================================================
// SUB-COMPONENT: Detail
// =========================================================================
function RedemptionDetail({
  redemption: r,
  notes,
  setNotes,
  onDeliver,
  onReset,
  delivering,
}: {
  redemption: Redemption;
  notes: string;
  setNotes: (n: string) => void;
  onDeliver: () => void;
  onReset: () => void;
  delivering: boolean;
}) {
  const emoji = CATEGORY_EMOJI[r.rewardCategory] || "🎁";

  return (
    <Card
      className={cn(
        r.status === "DELIVERED" && "border-blue-300 bg-blue-50/20",
        r.status === "PENDING" && "border-amber-300 bg-amber-50/20",
        r.status === "REJECTED" && "border-red-300 bg-red-50/20",
        r.status === "CANCELLED" && "border-slate-300 bg-slate-50/20"
      )}
    >
      <CardContent className="p-6 space-y-4">
        {/* Status banner */}
        {r.status === "DELIVERED" && (
          <div className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-2 rounded-md flex items-center gap-2">
            <Check className="h-4 w-4" />
            Hadiah ini sudah di-deliver pada {new Date(r.deliveredAt!).toLocaleString("id-ID")}
          </div>
        )}
        {r.status === "PENDING" && (
          <div className="bg-amber-100 text-amber-800 text-sm font-medium px-3 py-2 rounded-md flex items-center gap-2">
            ⚠️ Klaim ini belum disetujui. Approve dulu sebelum deliver.
          </div>
        )}
        {r.status === "REJECTED" && (
          <div className="bg-red-100 text-red-800 text-sm font-medium px-3 py-2 rounded-md flex items-center gap-2">
            ✗ Klaim ini ditolak. Tidak bisa di-deliver.
          </div>
        )}
        {r.status === "CANCELLED" && (
          <div className="bg-slate-100 text-slate-700 text-sm font-medium px-3 py-2 rounded-md flex items-center gap-2">
            ✗ Klaim ini dibatalkan oleh siswa.
          </div>
        )}

        {/* Reward info */}
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-5xl shrink-0">
            {emoji}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{r.rewardName}</h2>
            <div className="text-sm text-slate-500 mt-1">
              Kategori: {r.rewardCategory} • {r.pointsSpent} poin
            </div>
            {r.memberNote && (
              <div className="text-xs text-slate-600 italic mt-2 bg-white rounded p-2">
                💬 Catatan siswa: "{r.memberNote}"
              </div>
            )}
          </div>
        </div>

        {/* Member info */}
        <div className="border-t pt-4 space-y-2">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Pemohon
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-slate-400" />
              <div>
                <div className="font-semibold">{r.member.fullName}</div>
                <div className="text-xs text-slate-500">{r.member.user.email}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-slate-400" />
              <div>
                <div className="font-semibold">{r.member.memberNumber}</div>
                <div className="text-xs text-slate-500">
                  {r.member.classGrade || r.member.category}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              <div>
                <div className="text-xs text-slate-500">Diajukan</div>
                <div className="text-sm">
                  {new Date(r.createdAt).toLocaleString("id-ID")}
                </div>
              </div>
            </div>
            {r.approvedBy && (
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <div>
                  <div className="text-xs text-slate-500">Disetujui oleh</div>
                  <div className="text-sm">{r.approvedBy.name}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {r.status === "APPROVED" && (
          <div className="border-t pt-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">
                Catatan saat deliver (opsional)
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Mis: Diberikan secara langsung, kondisi baik"
                rows={2}
                maxLength={500}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={onDeliver}
                disabled={delivering}
                className="flex-1 bg-green-600 hover:bg-green-700"
                size="lg"
              >
                <Check className="h-4 w-4 mr-2" />
                {delivering ? "Memproses..." : "Konfirmasi Sudah Diterima"}
              </Button>
              <Button onClick={onReset} variant="outline" size="lg">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
