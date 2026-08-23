"use client";

/**
 * Offline Indicator — Shows online/offline status + pending sync.
 *
 * Sprint P - Tier 3 #9: PWA Offline Mode.
 *
 * Features:
 * - Real-time online/offline indicator
 * - Pending sync count
 * - Manual "Sync Now" button
 * - Failed operations warning
 * - Auto-hide when everything synced
 * - Compact chip design
 */

import { useEffect, useState, useCallback } from "react";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/form/button";
import { Badge } from "@/components/ui/data-display/badge";
import {
  isOnline,
  getQueueStats,
  triggerSyncNow,
  attachNetworkListeners,
  describeOperation,
  getStatusColor,
  type QueuedOperation,
} from "@/lib/offline-sync";
import { cn } from "@/lib/utils";

export function OfflineIndicator() {
  const [online, setOnline] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, syncing: 0, failed: 0, oldestPendingAge: null as number | null });
  const [syncing, setSyncing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    setOnline(isOnline());

    // Update stats
    const updateStats = () => setStats(getQueueStats());
    updateStats();

    // Attach listeners
    attachNetworkListeners(() => {
      updateStats();
      triggerSyncNow();
    });

    // Poll every 3 seconds
    const interval = setInterval(() => {
      setOnline(isOnline());
      updateStats();
    }, 3000);

    // Network event listeners
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      await triggerSyncNow();
      setStats(getQueueStats());
    } finally {
      setSyncing(false);
    }
  }, []);

  // Don't show if everything synced and online
  if (online && stats.total === 0) {
    return null;
  }

  const hasIssues = stats.failed > 0;
  const hasPending = stats.pending > 0 || stats.syncing > 0;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 max-w-sm",
        "bg-background border rounded-lg shadow-lg",
        "p-3 space-y-2"
      )}
    >
      {/* Status row */}
      <div className="flex items-center gap-2">
        {online ? (
          online && hasIssues ? (
            <AlertCircle className="h-4 w-4 text-amber-500" />
          ) : (
            <Wifi className="h-4 w-4 text-emerald-500" />
          )
        ) : (
          <WifiOff className="h-4 w-4 text-destructive" />
        )}
        <div className="flex-1 text-sm font-medium">
          {online ? (hasIssues ? "Sinkronisasi sebagian" : "Online") : "Offline Mode"}
        </div>
        {syncing && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      </div>

      {/* Message */}
      <div className="text-xs text-muted-foreground">
        {!online && (
          <span>
            Operasi akan diantrikan dan disinkronkan saat online kembali.
          </span>
        )}
        {online && hasPending && (
          <span>
            {stats.pending} operasi menunggu sinkronisasi
          </span>
        )}
        {online && hasIssues && !hasPending && (
          <span>
            {stats.failed} operasi gagal disinkronkan
          </span>
        )}
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1">
        {stats.pending > 0 && (
          <Badge variant="outline" className="text-[10px] h-4">
            <Loader2 className="h-2.5 w-2.5 mr-0.5" />
            {stats.pending} pending
          </Badge>
        )}
        {stats.syncing > 0 && (
          <Badge variant="secondary" className="text-[10px] h-4">
            <Loader2 className="h-2.5 w-2.5 mr-0.5 animate-spin" />
            {stats.syncing} syncing
          </Badge>
        )}
        {stats.failed > 0 && (
          <Badge variant="destructive" className="text-[10px] h-4">
            <AlertCircle className="h-2.5 w-2.5 mr-0.5" />
            {stats.failed} gagal
          </Badge>
        )}
      </div>

      {/* Action button */}
      {online && (hasPending || hasIssues) && (
        <Button
          variant="outline"
          size="sm"
          className="w-full h-7 text-xs"
          onClick={handleSync}
          disabled={syncing}
        >
          {syncing ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3 mr-1" />
          )}
          Sinkronkan Sekarang
        </Button>
      )}

      {stats.oldestPendingAge && stats.oldestPendingAge > 60000 && (
        <div className="text-[10px] text-amber-600 border-t pt-1">
          ⏱ Tertunda {Math.floor(stats.oldestPendingAge / 60000)} menit
        </div>
      )}
    </div>
  );
}
