/**
 * useCamera — React Native camera hook for barcode scanning.
 *
 * Requires: react-native-vision-camera + vision-camera-code-scanner
 * Setup: see MOBILE_SETUP.md for installation steps.
 *
 * Currently a stub — full implementation needs native module setup.
 */

import { useState, useEffect } from "react";
import { Platform, PermissionsAndroid } from "react-native";

export type CameraStatus = "idle" | "requesting" | "granted" | "denied" | "unsupported";

export function useCamera() {
  const [status, setStatus] = useState<CameraStatus>("idle");

  useEffect(() => {
    checkPermission();
  }, []);

  async function checkPermission() {
    if (Platform.OS !== "android" && Platform.OS !== "ios") {
      setStatus("unsupported");
      return;
    }
    // Check current permission
    // For now: just request on mount
    await requestPermission();
  }

  async function requestPermission(): Promise<boolean> {
    setStatus("requesting");
    try {
      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: "Izin Kamera",
            message: "Aplikasi butuh akses kamera untuk scan barcode",
            buttonPositive: "OK",
            buttonNegative: "Batal",
          }
        );
        const ok = granted === PermissionsAndroid.RESULTS.GRANTED;
        setStatus(ok ? "granted" : "denied");
        return ok;
      }
      // iOS: assume granted if Info.plist configured
      setStatus("granted");
      return true;
    } catch {
      setStatus("denied");
      return false;
    }
  }

  return { status, requestPermission };
}
