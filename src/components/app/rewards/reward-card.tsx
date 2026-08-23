"use client";

/**
 * RewardCard — Kartu hadiah untuk katalog.
 * Handles semua state: bisa klaim, poin kurang, stok habis, dll.
 */

import { Sparkles, Lock, Bell, Package } from "lucide-react";
import { Button } from "@/components/ui/form/button";
import { cn } from "@/lib/utils";

export interface RewardItem {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  category: string;
  pointCost: number;
  minRole: string;
  stock: number | null;
  stockClaimed: number;
  requiresApproval: boolean;
  maxPerMember: number | null;
  cooldownDays: number | null;
  isFeatured: boolean;
  remainingStock: number | null;
  isOutOfStock: boolean;
  canAfford: boolean;
}

interface RewardCardProps {
  reward: RewardItem;
  onClaim: (reward: RewardItem) => void;
  isLoading?: boolean;
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

const CATEGORY_GRADIENT: Record<string, string> = {
  BOOK: "from-amber-100 to-orange-100",
  STATIONERY: "from-blue-100 to-cyan-100",
  VOUCHER: "from-green-100 to-emerald-100",
  GIFT_CARD: "from-pink-100 to-rose-100",
  PRIVILEGE: "from-violet-100 to-purple-100",
  CERTIFICATE: "from-yellow-100 to-amber-100",
  CUSTOM: "from-slate-100 to-gray-100",
};

export function RewardCard({ reward, onClaim, isLoading }: RewardCardProps) {
  const emoji = CATEGORY_EMOJI[reward.category] || "🎁";
  const gradient = CATEGORY_GRADIENT[reward.category] || "from-slate-100 to-gray-100";

  // State determination
  const isLocked = !reward.canAfford && !reward.isOutOfStock;
  const isOutOfStock = reward.isOutOfStock;
  const canClaim = reward.canAfford && !isLoading;

  // Locked: berapa poin kurang
  const pointsShort = isLocked ? reward.pointCost - 0 : 0; // userBalance passed from parent, simplified here

  return (
    <div
      className={cn(
        "card-hover border rounded-xl overflow-hidden bg-white relative",
        isOutOfStock ? "border-slate-200 opacity-50" : "border-slate-200",
        reward.isFeatured && "ring-2 ring-amber-400"
      )}
    >
      {/* Top badges */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
        <span className="bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
          ⭐ {reward.pointCost}
        </span>
      </div>
      {reward.isFeatured && (
        <div className="absolute top-2 right-2 z-10">
          <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">
            🏆 Featured
          </span>
        </div>
      )}
      {reward.requiresApproval && (
        <div className="absolute top-9 right-2 z-10">
          <span className="bg-purple-100 text-purple-700 text-[10px] font-semibold px-1.5 py-0.5 rounded">
            Perlu approval
          </span>
        </div>
      )}

      {/* Image / Icon */}
      <div
        className={cn(
          "aspect-square flex items-center justify-center text-6xl",
          `bg-gradient-to-br ${gradient}`
        )}
      >
        {reward.imageUrl ? (
          <img
            src={reward.imageUrl}
            alt={reward.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{emoji}</span>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="text-[10px] text-slate-500 uppercase tracking-wider">
          {reward.category}
        </div>
        <div className="font-semibold text-sm text-slate-900 line-clamp-1">
          {reward.name}
        </div>
        {reward.description && (
          <div className="text-xs text-slate-500 line-clamp-2 mt-0.5 min-h-[2rem]">
            {reward.description}
          </div>
        )}
        <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
          {reward.stock === null ? (
            <>
              <Package className="h-3 w-3" />
              <span>Stok: Unlimited</span>
            </>
          ) : (
            <>
              <Package className="h-3 w-3" />
              <span>
                Stok: {reward.remainingStock} / {reward.stock}
              </span>
            </>
          )}
        </div>

        {/* Action button */}
        <div className="mt-2">
          {isOutOfStock ? (
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs"
              disabled
            >
              <Bell className="h-3 w-3 mr-1" />
              Beritahu Saya
            </Button>
          ) : isLocked ? (
            <Button
              size="sm"
              variant="secondary"
              className="w-full text-xs"
              disabled
            >
              <Lock className="h-3 w-3 mr-1" />
              Poin Kurang
            </Button>
          ) : (
            <Button
              size="sm"
              className="w-full text-xs"
              onClick={() => onClaim(reward)}
              disabled={isLoading}
            >
              {isLoading ? "Memproses..." : "Klaim →"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
