"use client";

import { useEffect } from "react";

/**
 * Client-side PWA init: register service worker + install prompt.
 */
export function PwaInit() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        console.log("[PWA] Service Worker registered:", reg.scope);
      })
      .catch((err) => {
        console.warn("[PWA] Service Worker registration failed:", err);
      });

    // Handle install prompt
    let deferredPrompt: any = null;
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
      // Expose to global for UI to use
      (window as any).__pwaInstallPrompt = deferredPrompt;
      window.dispatchEvent(new CustomEvent("pwa-install-available"));
    };
    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  return null;
}
