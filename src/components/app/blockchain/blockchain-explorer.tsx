"use client";

/**
 * Blockchain Explorer — View and verify audit chain.
 *
 * Features:
 * - Stats dashboard (total blocks, events, last block, chain valid)
 * - Verify chain button (full integrity check)
 * - Manual seal block (librarian only)
 * - Block list dengan detail view
 * - Visual hash chain representation
 * - Block details dengan merkle root info
 *
 * Visual style: blockchain/crypto themed (gradients, hash colors)
 */

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Link2,
  CheckCircle2,
  XCircle,
  Loader2,
  Hash,
  Database,
  Lock,
  Zap,
  Clock,
  Box,
  Shield,
  RefreshCw,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/layout/card";
import { Button } from "@/components/ui/form/button";
import { Badge } from "@/components/ui/data-display/badge";
import { cn } from "@/lib/utils";

interface BlockchainStats {
  totalBlocks: number;
  totalEvents: number;
  lastBlockAt: string | null;
  lastBlockHash: string | null;
  chainValid: boolean;
  pendingEvents: number;
}

interface VerificationResult {
  valid: boolean;
  totalBlocks: number;
  totalEvents: number;
  brokenAt: number | null;
  reason?: string;
  verifiedAt: string;
  duration: number;
}

interface BlockSummary {
  id: string;
  index: number;
  hash: string;
  eventCount: number;
  timestamp: string;
  sealReason: string | null;
}

interface BlockDetails {
  id: string;
  index: number;
  timestamp: string;
  previousHash: string;
  hash: string;
  merkleRoot: string;
  eventCount: number;
  nonce: number;
  difficulty: number;
  sealedBy: string | null;
  sealReason: string | null;
  events: Array<{
    id: string;
    userId: string;
    action: string;
    entityType: string;
    entityId: string | null;
    detail: string | null;
    createdAt: string;
  }>;
}

export function BlockchainExplorer() {
  const [stats, setStats] = useState<BlockchainStats | null>(null);
  const [blocks, setBlocks] = useState<BlockSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [sealing, setSealing] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<BlockDetails | null>(null);
  const [loadingBlock, setLoadingBlock] = useState(false);

  const load = useCallback(async () => {
    try {
      const [statsRes, blocksRes] = await Promise.all([
        fetch("/api/blockchain/stats").then((r) => r.json()),
        fetch("/api/blockchain/blocks?limit=20").then((r) => r.json()),
      ]);
      setStats(statsRes);
      setBlocks(blocksRes.items || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10_000);
    return () => clearInterval(interval);
  }, [load]);

  // Verify chain
  const verify = useCallback(async () => {
    setVerifying(true);
    try {
      const res = await fetch("/api/blockchain/verify");
      const data: VerificationResult = await res.json();
      setVerification(data);
    } catch {
      setVerification({
        valid: false,
        totalBlocks: 0,
        totalEvents: 0,
        brokenAt: null,
        reason: "Network error",
        verifiedAt: new Date().toISOString(),
        duration: 0,
      });
    } finally {
      setVerifying(false);
    }
  }, []);

  // Seal block
  const seal = useCallback(async () => {
    setSealing(true);
    try {
      const res = await fetch("/api/blockchain/seal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        await load();
      }
    } catch {
      // ignore
    } finally {
      setSealing(false);
    }
  }, [load]);

  // Load block details
  const selectBlock = useCallback(async (index: number) => {
    setLoadingBlock(true);
    try {
      const res = await fetch(`/api/blockchain/blocks?index=${index}`);
      const data: BlockDetails = await res.json();
      setSelectedBlock(data);
    } catch {
      setSelectedBlock(null);
    } finally {
      setLoadingBlock(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<Box className="h-4 w-4" />}
          label="Total Blocks"
          value={stats?.totalBlocks ?? 0}
          color="blue"
        />
        <StatCard
          icon={<Database className="h-4 w-4" />}
          label="Total Events"
          value={stats?.totalEvents ?? 0}
          color="purple"
        />
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="Pending Events"
          value={stats?.pendingEvents ?? 0}
          color="amber"
        />
        <StatCard
          icon={<Shield className="h-4 w-4" />}
          label="Chain Status"
          value={stats?.chainValid ? "Valid" : "Broken"}
          color={stats?.chainValid ? "green" : "red"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Block list */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Link2 className="h-5 w-5" />
              Chain Blocks
              <Badge variant="outline" className="ml-auto">
                {blocks.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {blocks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Belum ada block. Tunggu audit events atau seal manual.
              </p>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {blocks.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => selectBlock(b.index)}
                    className={cn(
                      "w-full text-left p-3 border-b hover:bg-muted/50 transition-colors",
                      selectedBlock?.index === b.index && "bg-primary/5"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground text-xs font-bold">
                          #{b.index}
                        </div>
                        <div>
                          <div className="text-sm font-medium">
                            Block #{b.index}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {b.hash.slice(0, 10)}...
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-medium">{b.eventCount} events</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(b.timestamp).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Block details or actions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {selectedBlock ? (
                <>
                  <Hash className="h-5 w-5" />
                  Block #{selectedBlock.index}
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5" />
                  Tindakan
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedBlock ? (
              <BlockDetailView block={selectedBlock} />
            ) : (
              <div className="space-y-4">
                {/* Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button
                    onClick={verify}
                    disabled={verifying}
                    className="w-full"
                    variant="default"
                  >
                    {verifying ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Shield className="h-4 w-4" />
                    )}
                    Verifikasi Chain
                  </Button>
                  <Button
                    onClick={seal}
                    disabled={sealing || (stats?.pendingEvents ?? 0) === 0}
                    className="w-full"
                    variant="outline"
                  >
                    {sealing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}
                    Seal Block Sekarang
                  </Button>
                </div>

                {/* Verification result */}
                {verification && (
                  <div
                    className={cn(
                      "p-4 rounded-lg border",
                      verification.valid
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {verification.valid ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <span
                        className={cn(
                          "font-medium",
                          verification.valid ? "text-green-800" : "text-red-800"
                        )}
                      >
                        {verification.valid
                          ? "Chain Valid"
                          : `Chain Broken at block #${verification.brokenAt}`}
                      </span>
                    </div>
                    <div className="text-xs space-y-1">
                      <p>
                        Verified {verification.totalBlocks} blocks (
                        {verification.totalEvents} events) in{" "}
                        {verification.duration}ms
                      </p>
                      {verification.reason && (
                        <p className="text-red-700">{verification.reason}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Stats */}
                {stats && (
                  <div className="border-t pt-4 space-y-2 text-sm">
                    <h3 className="font-medium">Info Chain</h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Block terakhir:</span>
                        <div className="font-mono">
                          {stats.lastBlockAt
                            ? new Date(stats.lastBlockAt).toLocaleString("id-ID")
                            : "—"}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Last hash:</span>
                        <div className="font-mono text-[10px] break-all">
                          {stats.lastBlockHash?.slice(0, 32) || "—"}...
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Info */}
                <div className="border-t pt-4 text-xs text-muted-foreground space-y-1">
                  <p className="flex items-start gap-1">
                    <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>
                      Setiap audit event di-hash dengan SHA-256 dan di-link ke
                      block sebelumnya. Modifikasi 1 block invalidates seluruh
                      chain.
                    </span>
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function BlockDetailView({ block }: { block: BlockDetails }) {
  return (
    <div className="space-y-3">
      {/* Hash chain visual */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">Previous:</span>
        <code className="px-1 bg-muted rounded font-mono truncate flex-1">
          {block.previousHash.slice(0, 24)}...
        </code>
        <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
        <code className="px-1 bg-primary/10 text-primary rounded font-mono truncate flex-1">
          {block.hash.slice(0, 24)}...
        </code>
      </div>

      {/* Block info */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">Timestamp:</span>
          <div className="font-mono">
            {new Date(block.timestamp).toLocaleString("id-ID")}
          </div>
        </div>
        <div>
          <span className="text-muted-foreground">Sealed by:</span>
          <div>{block.sealedBy || "—"}</div>
        </div>
        <div>
          <span className="text-muted-foreground">Reason:</span>
          <div>
            <Badge variant="outline">{block.sealReason || "MANUAL"}</Badge>
          </div>
        </div>
        <div>
          <span className="text-muted-foreground">Nonce:</span>
          <div className="font-mono">{block.nonce}</div>
        </div>
        <div className="col-span-2">
          <span className="text-muted-foreground">Merkle Root:</span>
          <div className="font-mono text-[10px] break-all bg-muted p-1 rounded">
            {block.merkleRoot}
          </div>
        </div>
      </div>

      {/* Events list */}
      <div className="border-t pt-3">
        <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
          <Database className="h-4 w-4" />
          Events ({block.events.length})
        </h3>
        <div className="max-h-64 overflow-y-auto space-y-1">
          {block.events.length === 0 ? (
            <p className="text-xs text-muted-foreground">No events</p>
          ) : (
            block.events.slice(0, 50).map((e) => (
              <div
                key={e.id}
                className="text-xs p-2 bg-muted/30 rounded border-l-2 border-primary/40"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{e.action}</span>
                  <span className="text-muted-foreground text-[10px]">
                    {new Date(e.createdAt).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </div>
                <div className="text-muted-foreground text-[10px]">
                  {e.entityType} · {e.entityId?.slice(0, 12) || "—"} · {e.userId.slice(0, 8)}
                </div>
                {e.detail && (
                  <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                    {e.detail}
                  </div>
                )}
              </div>
            ))
          )}
          {block.events.length > 50 && (
            <p className="text-xs text-center text-muted-foreground py-2">
              + {block.events.length - 50} more events
            </p>
          )}
        </div>
      </div>

      <div className="border-t pt-3">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            // Trigger verify for this specific event
            if (block.events[0]) {
              fetch(`/api/blockchain/events/${block.events[0].id}`)
                .then((r) => r.json())
                .then((data) => {
                  if (data.valid) {
                    toast.success(`Event verified in block #${data.blockIndex}`);
                  } else {
                    toast.error(`Verification failed: ${data.reason}`);
                  }
                });
            }
          }}
          className="w-full"
        >
          <RefreshCw className="h-3 w-3" />
          Verify Sample Event
        </Button>
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
  value: number | string;
  color: "blue" | "purple" | "amber" | "green" | "red";
}) {
  const colorMap: Record<string, string> = {
    blue: "from-blue-500 to-blue-600",
    purple: "from-purple-500 to-purple-600",
    amber: "from-amber-500 to-amber-600",
    green: "from-green-500 to-green-600",
    red: "from-red-500 to-red-600",
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
              "h-8 w-8 rounded-lg flex items-center justify-center text-white bg-gradient-to-br",
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
