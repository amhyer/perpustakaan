"use client";

/**
 * PWA Install Button — Compact install trigger for header.
 *
 * Sprint V - Production-Ready PWA.
 *
 * Compact button that appears in header, opens install modal on click.
 */

import { useState, useEffect } from "react";
import { Download, X, Smartphone, Monitor, Check, Share } from "lucide-react";
import { Button } from "@/components/ui/form/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/overlay/dialog";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STORAGE_KEY = "ji-install-prompt-dismissed";

export function PwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Already installed?
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // iOS?
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream);

    // Hide if dismissed
    if (localStorage.getItem(STORAGE_KEY) === "permanent") return;

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setIsInstalled(true));

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleClick = () => {
    if (isIOS) {
      setShowModal(true);
    } else if (deferredPrompt) {
      setShowModal(true);
    } else {
      // No prompt available, show instructions
      setShowModal(true);
    }
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
      setShowModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDismiss = (permanent: boolean) => {
    setShowModal(false);
    if (permanent) {
      localStorage.setItem(STORAGE_KEY, "permanent");
    }
  };

  if (isInstalled) return null;

  // Show button if we have a prompt OR are on iOS
  if (!deferredPrompt && !isIOS) {
    return null;
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        className="gap-1.5 hidden sm:flex"
        title="Install aplikasi"
      >
        <Download className="h-3.5 w-3.5" />
        <span className="hidden md:inline">Install App</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClick}
        className="sm:hidden"
        title="Install aplikasi"
      >
        <Download className="h-4 w-4" />
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogTitle className="text-xl flex items-center gap-2">
            <span className="text-2xl">📚</span>
            Install Jendela Ilmu
          </DialogTitle>
          <DialogDescription>
            Dapatkan akses lebih cepat ke perpustakaan dari {isIOS ? "home screen iPhone/iPad" : "desktop atau home screen"}.
            Bekerja seperti app native, dengan dukungan offline.
          </DialogDescription>

          <div className="space-y-3 my-4">
            <Feature emoji="⚡" title="Super Cepat" desc="Loading instant, tanpa address bar" />
            <Feature emoji="📡" title="Bisa Offline" desc="Lihat buku walaupun tanpa internet" />
            <Feature emoji="🔔" title="Notifikasi" desc="Pengingat jatuh tempo & rekomendasi baru" />
            <Feature emoji="📱" title="Multi-device" desc="Install di HP, tablet, & laptop" />
            <Feature emoji="🔐" title="Login Tersimpan" desc="Tidak perlu login berulang" />
          </div>

          {isIOS ? (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800 space-y-1">
              <div className="font-medium">Cara install di iPhone/iPad:</div>
              <ol className="list-decimal list-inside space-y-0.5 text-xs">
                <li>Tap tombol Share <Share className="inline h-3 w-3" /> di bar browser</li>
                <li>Scroll ke bawah, pilih <strong>"Add to Home Screen"</strong></li>
                <li>Tap <strong>"Add"</strong> untuk konfirmasi</li>
              </ol>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button onClick={handleInstall} className="flex-1" size="lg">
                <Download className="h-4 w-4 mr-2" />
                Install Sekarang
              </Button>
            </div>
          )}

          <div className="flex justify-between text-xs">
            <button
              onClick={() => handleDismiss(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              Jangan tampilkan lagi
            </button>
            <button
              onClick={() => handleDismiss(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              Nanti
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Feature({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-lg shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
    </div>
  );
}
