"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Share2, PlusSquare, Smartphone, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/form/button";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

/**
 * PWA Install Prompt — muncul otomatis saat app bisa di-install.
 *
 * Cara kerja:
 * 1. Browser fire `beforeinstallprompt` event
 * 2. Kita simpan event-nya
 * 3. Tampilkan banner UI untuk trigger prompt()
 * 4. User accept → app ter-install
 *
 * iOS Safari tidak support beforeinstallprompt,
 * jadi kita tampilkan instruksi manual "Share → Add to Home Screen".
 */
export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    // Check if user already dismissed (don't nag)
    const wasDismissed = localStorage.getItem("pwa:install-dismissed");
    if (wasDismissed) {
      const dismissedAt = parseInt(wasDismissed);
      // Re-prompt setelah 7 hari
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
      }
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
    setIsIOS(isIOSDevice);

    // Listen for install prompt event (Chrome/Edge/Android)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Tampilkan prompt setelah 30 detik
      setTimeout(() => setShowPrompt(true), 30000);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Listen for successful install
    window.addEventListener("appinstalled", () => {
      setInstalled(true);
      setShowPrompt(false);
      console.log("[PWA] App installed");
    });

    // iOS: show after 60 seconds
    if (isIOSDevice) {
      setTimeout(() => setShowPrompt(true), 60000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // iOS fallback - show instructions
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setInstalled(true);
      }
      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (err) {
      console.error("[PWA] Install failed:", err);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("pwa:install-dismissed", String(Date.now()));
    }
  };

  if (installed || dismissed) return null;
  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-40"
      >
        <div className="bg-card border-2 border-primary/20 rounded-2xl shadow-2xl p-4 flex gap-3 items-start">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            <Smartphone className="h-5 w-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm">Pasang di Perangkat</h3>
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            </div>
            {isIOS ? (
              <>
                <p className="text-xs text-muted-foreground mb-3">
                  Untukpasang di iPhone/iPad: tap{" "}
                  <Share2 className="inline h-3 w-3" /> Share, lalu pilih{" "}
                  <PlusSquare className="inline h-3 w-3" /> Add to Home Screen.
                </p>
                <div className="flex gap-2">
                  <Button onClick={handleDismiss} variant="ghost" size="sm">
                    Nanti
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-3">
                  Pasang sebagai aplikasi untuk akses lebih cepat & notifikasi real-time.
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={handleInstall}
                    size="sm"
                    className="gap-1.5 flex-1"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Pasang
                  </Button>
                  <Button onClick={handleDismiss} variant="ghost" size="sm">
                    Nanti
                  </Button>
                </div>
              </>
            )}
          </div>

          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground p-1"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
