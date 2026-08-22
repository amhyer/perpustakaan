"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  ShieldCheck,
  Smartphone,
  Monitor,
  Tablet,
  Trash2,
  Loader2,
  Globe,
  LogOut,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card";
import { Button } from "@/components/ui/form/button";
import { Badge } from "@/components/ui/data-display/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/overlay/alert-dialog";
import { PageHeader, EmptyState } from "@/components/app/shared/page-header";
import { useFetch } from "@/hooks/use-fetch";
import { formatDate } from "@/lib/constants";

interface ActiveSession {
  id: string;
  userAgent: string | null;
  ip: string | null;
  lastActive: string;
  createdAt: string;
}

function detectDevice(ua: string | null): { icon: any; label: string } {
  if (!ua) return { icon: Globe, label: "Unknown device" };
  const lower = ua.toLowerCase();
  if (lower.includes("iphone") || lower.includes("android")) {
    return { icon: Smartphone, label: "Mobile" };
  }
  if (lower.includes("ipad") || lower.includes("tablet")) {
    return { icon: Tablet, label: "Tablet" };
  }
  return { icon: Monitor, label: "Desktop" };
}

function getBrowser(ua: string | null): string {
  if (!ua) return "Unknown";
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("Chrome/")) return "Chrome";
  if (ua.includes("Firefox/")) return "Firefox";
  if (ua.includes("Safari/")) return "Safari";
  if (ua.includes("Opera") || ua.includes("OPR/")) return "Opera";
  return "Browser";
}

export function MySessionsView() {
  const { data: sessions, loading, refetch } = useFetch<ActiveSession[]>("/api/auth/sessions");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [logoutAllOpen, setLogoutAllOpen] = useState(false);
  const [logoutAll, setLogoutAll] = useState(false);

  async function handleDelete() {
    if (!deletingId) return;
    setDeleting(true);
    try {
      await fetch(`/api/auth/sessions/${deletingId}`, { method: "DELETE" });
      toast.success("Sesi diakhiri. Device ini akan logout dalam beberapa detik.");
      setDeletingId(null);
      refetch();
      // Refresh halaman setelah 2 detik karena current session mungkin ikut kena
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal");
    } finally {
      setDeleting(false);
    }
  }

  async function handleLogoutAll() {
    setLogoutAll(true);
    try {
      await fetch("/api/auth/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keepCurrent: false }),
      });
      toast.success("Semua sesi diakhiri. Anda akan logout...");
      setLogoutAllOpen(false);
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal");
    } finally {
      setLogoutAll(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sesi Aktif"
        description="Kelola device yang sedang login ke akun Anda"
        icon={ShieldCheck}
        actions={
          sessions && sessions.length > 1 ? (
            <Button
              variant="outline"
              onClick={() => setLogoutAllOpen(true)}
              className="gap-2 text-destructive hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Logout Semua Device
            </Button>
          ) : null
        }
      />

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Keamanan Akun</p>
              <p>
                Jika Anda melihat device yang tidak dikenali, segera akhiri sesi tersebut dan
                ganti password Anda. Tips: rutin logout dari device bersama (warnet, lab sekolah).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Sesi ({sessions?.length || 0})</CardTitle>
          <CardDescription>
            Sesi login yang sedang aktif untuk akun Anda
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : !sessions || sessions.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="Tidak ada sesi aktif"
              description="Login untuk membuat sesi baru."
            />
          ) : (
            <div className="space-y-2">
              {sessions.map((s, idx) => {
                const { icon: DeviceIcon, label: deviceLabel } = detectDevice(s.userAgent);
                const browser = getBrowser(s.userAgent);
                const isCurrent = idx === 0; // asumsi paling baru = current
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:shadow-sm transition-shadow"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                      <DeviceIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm text-foreground">
                          {browser} di {deviceLabel}
                        </p>
                        {isCurrent && (
                          <Badge variant="default" className="text-[10px] gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Sesi Ini
                          </Badge>
                        )}
                      </div>
                      {s.ip && (
                        <p className="text-xs text-muted-foreground font-mono">IP: {s.ip}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        Login: {formatDate(s.createdAt)} • Aktif: {formatDate(s.lastActive)}
                      </p>
                    </div>
                    {!isCurrent && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeletingId(s.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        title="Akhiri sesi"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert: Delete session */}
      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Akhiri Sesi Ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Device ini akan logout dan perlu login ulang. Data di aplikasi akan hilang
              (tapi tersimpan di server).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Akhiri Sesi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert: Logout all */}
      <AlertDialog open={logoutAllOpen} onOpenChange={setLogoutAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Logout dari Semua Device?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan logout dari semua device termasuk yang sedang Anda gunakan sekarang.
              Anda perlu login ulang. Tindakan ini berguna jika Anda curiga akun dibobol.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={logoutAll}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleLogoutAll();
              }}
              disabled={logoutAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            >
              {logoutAll && <Loader2 className="h-4 w-4 animate-spin" />}
              Logout Semua
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
