"use client";

/**
 * PWA Install Prompt — Smart native-like install banner.
 *
 * Sprint V - Production-Ready PWA.
 *
 * Features:
 * - Detects install eligibility (beforeinstallprompt)
 * - Detects iOS Safari (manual instructions)
 * - Detects already installed (standalone)
 * - Beautiful native-style prompt
 * - User can dismiss with "Don't show again"
 * - Tracks install events
 * - Shows app-like preview before install
 */

import { useState, useEffect, useCallback } from "react";
import { Download, X, Smartphone, Monitor, Check, Share } from "lucide-react";
import { Button } from "@/components/ui/form/button";
import { Card, CardContent } from "@/components/ui/layout/card";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface InstallPromptProps {
  className?: string;
  /** Show as banner (top) or modal (center) */
  variant?: "banner" | "modal" | "inline";
  /** Auto-show after delay (ms), 0 = disabled */
  autoShowDelay?: number;
}

const STORAGE_KEY = "ji-install-prompt-dismissed";
const STORAGE_KEY_INSTALLED = "ji-install-prompt-installed";

export function InstallPrompt({
  className,
  variant = "banner",
  autoShowDelay = 30000, // 30 seconds
}: InstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [platform, setPlatform] = useState<"android" | "ios" | "desktop" | "unknown">("unknown");

  useEffect(() => {
    // Check if already installed
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes("android-app://");

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Check if user dismissed before
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed === "true") return;

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);
    if (isIOSDevice) {
      setPlatform("ios");
    } else if (/Android/.test(navigator.userAgent)) {
      setPlatform("android");
    } else if (/Windows|Mac|Linux/.test(navigator.userAgent)) {
      setPlatform("desktop");
    }

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      localStorage.setItem(STORAGE_KEY_INSTALLED, "true");
    };
    window.addEventListener("appinstalled", handleAppInstalled);

    // Auto-show after delay if we have a prompt or are on iOS
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (autoShowDelay > 0) {
      timer = setTimeout(() => {
        // Show if we have a prompt OR we're on iOS
        const hasPrompt = (e: Event) => e.type === "beforeinstallprompt";
        window.addEventListener(
          "beforeinstallprompt",
          function handler(e: Event) {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setShowPrompt(true);
            window.removeEventListener("beforeinstallprompt", handler);
          },
          { once: true }
        );
        // For iOS, always show instructions
        if (isIOSDevice) {
          setShowPrompt(true);
        }
      }, autoShowDelay);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
      if (timer) clearTimeout(timer);
    };
  }, [autoShowDelay]);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;

      if (choice.outcome === "accepted") {
        setIsInstalled(true);
        setShowPrompt(false);
        localStorage.setItem(STORAGE_KEY_INSTALLED, "true");
      }

      setDeferredPrompt(null);
    } catch (err) {
      console.error("Install failed", err);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback((permanent: boolean = false) => {
    setShowPrompt(false);
    if (permanent) {
      localStorage.setItem(STORAGE_KEY, "true");
    }
    setDeferredPrompt(null);
  }, []);

  if (isInstalled) {
    return (
      <Card className={cn("bg-emerald-50 border-emerald-200", className)}>
        <CardContent className="p-3 flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-600" />
          <div className="flex-1 text-sm text-emerald-700">
            App sudah terinstall! Buka dari home screen.
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!showPrompt) return null;

  // iOS-specific instructions
  if (isIOS) {
    if (variant === "banner") {
      return (
        <Card className={cn("border-blue-200 bg-blue-50", className)}>
          <CardContent className="p-3 flex items-start gap-3">
            <Smartphone className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium text-blue-700">
                Install di iPhone/iPad
              </div>
              <div className="text-xs text-blue-600 mt-0.5">
                Tap <Share className="inline h-3 w-3" /> lalu pilih "Add to Home Screen"
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDismiss(true)}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </CardContent>
        </Card>
      );
    }
    // Modal variant for iOS
    return <InstallModal onClose={() => handleDismiss(false)} onDismiss={() => handleDismiss(true)} isIOS />;
  }

  // Android/Desktop with deferredPrompt
  if (!deferredPrompt && variant !== "inline") return null;

  if (variant === "banner") {
    return (
      <Card className={cn("border-primary/30 bg-gradient-to-r from-primary/5 to-accent/5", className)}>
        <CardContent className="p-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            {platform === "desktop" ? (
              <Monitor className="h-5 w-5 text-primary" />
            ) : (
              <Smartphone className="h-5 w-5 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">Install Jendela Ilmu</div>
            <div className="text-xs text-muted-foreground truncate">
              Akses lebih cepat dari {platform === "desktop" ? "desktop" : "home screen"}
            </div>
          </div>
          <Button size="sm" onClick={handleInstall}>
            <Download className="h-3.5 w-3.5 mr-1" />
            Install
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDismiss(false)}
            className="h-7 w-7 p-0"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (variant === "modal") {
    return <InstallModal onClose={() => handleDismiss(false)} onDismiss={() => handleDismiss(true)} onInstall={handleInstall} />;
  }

  // Inline variant
  return (
    <Card className={className}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Download className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Install Jendela Ilmu App</h3>
            <p className="text-xs text-muted-foreground">
              Akses perpustakaan langsung dari {platform === "desktop" ? "desktop" : "home screen"}.
              Bekerja offline, lebih cepat, seperti app native.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center p-2 bg-muted/30 rounded">
            <div className="text-base">⚡</div>
            <div className="text-[10px]">Cepat</div>
          </div>
          <div className="text-center p-2 bg-muted/30 rounded">
            <div className="text-base">📡</div>
            <div className="text-[10px]">Offline</div>
          </div>
          <div className="text-center p-2 bg-muted/30 rounded">
            <div className="text-base">🏠</div>
            <div className="text-[10px]">Home Screen</div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleInstall} className="flex-1">
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Install Sekarang
          </Button>
          <Button variant="outline" onClick={() => handleDismiss(true)}>
            Nanti
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function InstallModal({
  onClose,
  onDismiss,
  onInstall,
  isIOS = false,
}: {
  onClose: () => void;
  onDismiss: () => void;
  onInstall?: () => void;
  isIOS?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in">
      <Card className="max-w-md w-full">
        <CardContent className="p-6 space-y-4">
          <div className="flex justify-between items-start">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <span className="text-4xl">📚</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div>
            <h2 className="text-xl font-bold">Install Jendela Ilmu</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Akses perpustakaan langsung dari {isIOS ? "home screen" : "desktop atau home screen"}.
              Bekerja seperti app native, dengan akses offline.
            </p>
          </div>

          <div className="space-y-2">
            <Feature emoji="⚡" title="Super Cepat" description="Loading instant, no browser bar" />
            <Feature emoji="📡" title="Bisa Offline" description="Lihat buku walaupun tanpa internet" />
            <Feature emoji="🔔" title="Notifikasi" description="Pengingat jatuh tempo & rekomendasi baru" />
            <Feature emoji="📱" title="Multi-device" description="Install di HP, tablet, & laptop" />
          </div>

          {isIOS ? (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-700">
              <strong>Cara install di iOS:</strong> Tap tombol Share{" "}
              <Share className="inline h-3 w-3" /> di bawah, lalu pilih{" "}
              <strong>"Add to Home Screen"</strong>.
            </div>
          ) : (
            <Button onClick={onInstall} className="w-full" size="lg">
              <Download className="h-4 w-4 mr-2" />
              Install App
            </Button>
          )}

          <div className="flex gap-2">
            <Button variant="ghost" onClick={onDismiss} className="flex-1 text-xs">
              Jangan tampilkan lagi
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1 text-xs">
              Nanti
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Feature({ emoji, title, description }: { emoji: string; title: string; description: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="text-lg shrink-0">{emoji}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </div>
  );
}
