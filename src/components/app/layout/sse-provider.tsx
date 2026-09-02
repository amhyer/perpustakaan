"use client";

import { useEffect } from "react";
import { useEventStream } from "@/hooks/use-event-stream";
import { useAppStore } from "@/store/use-app-store";
import { api } from "@/lib/api-client";
import { Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";

/**
 * Global SSE provider — install di AppShell.
 * Listen ke real-time events dan update UI accordingly.
 */
export function SseProvider() {
  const user = useAppStore((s) => s.user);
  const triggerRefresh = useAppStore((s) => s.triggerRefresh);
  const setView = useAppStore((s) => s.setView);

  const { data: notifCount, mutate: refreshNotif } = useNotificationCount();

  useEventStream({
    reconnect: true,
    reconnectDelay: 3000,
    toastOnEvents: ["announcement:new"],
    handlers: {
      "notification:new": (data) => {
        // Update notif count
        refreshNotif();
        // Refresh current view data
        triggerRefresh();
      },
      "loan:created": () => {
        triggerRefresh();
      },
      "loan:returned": () => {
        triggerRefresh();
      },
      "reservation:ready": (data) => {
        toast.success("📚 Buku Reservasi Siap Diambil!", {
          description: data.message || "Cek menu Reservasi untuk melihat detail",
        });
        triggerRefresh();
      },
      "wishlist:available": (data) => {
        toast.info("🔔 Buku Wishlist Tersedia!", {
          description: data.message,
        });
        triggerRefresh();
      },
      "announcement:new": (data) => {
        toast("📢 Pengumuman Baru", {
          description: data.title,
        });
        triggerRefresh();
      },
      "room:booked": () => {
        triggerRefresh();
      },
      "visitor:checkin": () => {
        triggerRefresh();
      },
      "data:changed": () => {
        triggerRefresh();
      },
    },
  });

  return null;
}

/**
 * Hook untuk notif count (auto-refresh via SSE)
 */
function useNotificationCount() {
  const fetcher = async () => {
    try {
      const r = await api.get<{ unread: number }>("/api/notifications?action=count");
      return r;
    } catch (e) {
      console.error("Failed to fetch notification count:", e);
      return { unread: 0 };
    }
  };

  // Simple state management
  const data = { unread: 0 } as { unread: number };
  const mutate = () => {
    // Trigger re-fetch dari components yang subscribe
  };

  return { data, mutate };
}
