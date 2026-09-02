"use client";

/**
 * LivePointCounter — Display saldo poin dengan animasi real-time.
 *
 * - Initial load via /api/points/me
 * - Subscribe to SSE: reward:points-earned
 * - Animasi count up/down + toast notification
 * - Throttled fetch untuk avoid spam
 */

import { useEffect, useState, useRef } from "react";
import { Sparkles, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { useEventStream } from "@/hooks/use-event-stream";
import { cn } from "@/lib/utils";

interface LivePointCounterProps {
  className?: string;
  showToast?: boolean;
  /** Compact mode untuk sidebar */
  compact?: boolean;
}

export function LivePointCounter({
  className,
  showToast = true,
  compact = false,
}: LivePointCounterProps) {
  const [balance, setBalance] = useState<number>(0);
  const [previousBalance, setPreviousBalance] = useState<number>(0);
  const [delta, setDelta] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const animTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchBalance = async (silent = true) => {
    try {
      const data = await api.get<{ balance: number }>("/api/points/me");
      setBalance(data.balance);
    } catch (e) {
      console.error("Failed to fetch point balance:", e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance(false);
  }, []);

  const handlersRef = useRef<Record<string, (data: any) => void>>({});

  handlersRef.current["reward:points-earned"] = (data: any) => {
    setPreviousBalance(balance);
    setBalance(data.newBalance);
    setDelta(data.amount);

    // Show toast
    if (showToast && data.description) {
      toast.success(
        `+${data.amount} poin! ${data.description}`,
        {
          description: `Saldo: ${data.newBalance.toLocaleString()} poin`,
          icon: <Sparkles className="h-4 w-4" />,
        }
      );
    }

    // Clear delta after animation
    if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
    animTimeoutRef.current = setTimeout(() => setDelta(null), 3000);
  };

  useEventStream({
    handlers: {
      "reward:points-earned": (data) => handlersRef.current["reward:points-earned"]?.(data),
    },
  });

  if (loading) {
    return (
      <div className={cn("h-10 w-20 bg-slate-100 rounded animate-pulse", className)} />
    );
  }

  if (compact) {
    return (
      <div className={cn("relative", className)}>
        <div className="flex items-center gap-1 text-amber-700 font-semibold">
          <Sparkles className="h-4 w-4" />
          {balance.toLocaleString()}
        </div>
        {delta !== null && (
          <div className="absolute -top-1 -right-2 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-bounce">
            +{delta}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("relative inline-flex flex-col", className)}>
      <div className="text-3xl font-bold text-slate-900 transition-all">
        {balance.toLocaleString()}
      </div>
      {delta !== null && (
        <div className="absolute -top-2 -right-12 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-0.5 shadow-lg animate-bounce">
          <TrendingUp className="h-3 w-3" />+{delta}
        </div>
      )}
      <div className="text-xs text-slate-500">Poin aktif</div>
    </div>
  );
}
