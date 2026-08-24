"use client";

/**
 * usePushNotification — Subscribe/unsubscribe untuk push notification.
 *
 * Returns:
 * - isSupported: browser support push
 * - isSubscribed: currently subscribed
 * - permission: Notification permission state
 * - subscribe(): request permission & save subscription
 * - unsubscribe(): remove subscription
 */

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";

export interface PushState {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission | "unsupported";
  loading: boolean;
}

export function usePushNotification() {
  const [state, setState] = useState<PushState>({
    isSupported: false,
    isSubscribed: false,
    permission: "default",
    loading: true,
  });

  const refresh = useCallback(async () => {
    if (typeof window === "undefined") {
      setState((s) => ({ ...s, isSupported: false, loading: false }));
      return;
    }

    const isSupported = "serviceWorker" in navigator && "PushManager" in window;
    if (!isSupported) {
      setState({
        isSupported: false,
        isSubscribed: false,
        permission: "unsupported",
        loading: false,
      });
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setState({
        isSupported: true,
        isSubscribed: !!subscription,
        permission: Notification.permission,
        loading: false,
      });
    } catch (err) {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const subscribe = useCallback(async () => {
    if (typeof window === "undefined") return false;

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Izin notifikasi ditolak");
        return false;
      }

      const registration = await navigator.serviceWorker.ready;

      // Get VAPID public key from server
      const { publicKey, isConfigured } = await api.get<{
        isConfigured: boolean;
        publicKey: string | null;
      }>("/api/push/subscribe");

      if (!isConfigured || !publicKey) {
        toast.error("Push notification belum dikonfigurasi di server");
        return false;
      }

      // Subscribe
      const vapidKey = urlBase64ToUint8Array(publicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey as BufferSource,
      });

      // Save to server
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const json = subscription.toJSON() as any;
      await api.post("/api/push/subscribe", {
        endpoint: json.endpoint,
        keys: json.keys,
      });

      toast.success("Notifikasi aktif! Kamu akan dapat update penting.");
      await refresh();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal subscribe");
      return false;
    }
  }, [refresh]);

  const unsubscribe = useCallback(async () => {
    if (typeof window === "undefined") return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const endpoint = (subscription.toJSON() as any).endpoint;
        await subscription.unsubscribe();
        await api.delete("/api/push/subscribe");
      }
      toast.success("Notifikasi dimatikan");
      await refresh();
      return true;
    } catch (err) {
      toast.error("Gagal unsubscribe");
      return false;
    }
  }, [refresh]);

  return { ...state, subscribe, unsubscribe, refresh };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
