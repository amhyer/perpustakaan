/**
 * usePushNotifications — React Native push notification hook.
 *
 * Requires: @react-native-firebase/messaging
 * Setup: see MOBILE_SETUP.md
 *
 * Currently a stub — full implementation needs Firebase project setup.
 */

import { useEffect, useState } from "react";
import { Platform } from "react-native";

export interface PushNotification {
  title: string;
  body: string;
  data?: Record<string, any>;
  timestamp: string;
}

export function usePushNotifications() {
  const [token, setToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<PushNotification | null>(null);
  const [permission, setPermission] = useState<"unknown" | "granted" | "denied">("unknown");

  useEffect(() => {
    // TODO: integrate Firebase
    // - requestPermission()
    // - getToken() → setToken
    // - onMessage(handler) → setNotification
    // - onNotificationOpenedApp(handler)

    // Stub: just log
    if (Platform.OS === "ios" || Platform.OS === "android") {
      // Will be implemented when Firebase is configured
      setPermission("unknown");
    }
  }, []);

  return { token, notification, permission };
}
