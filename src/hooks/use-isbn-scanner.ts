"use client";

/**
 * useIsbnScanner — Hook untuk ISBN barcode scanning via camera.
 *
 * Uses html5-qrcode library yang support multiple barcode formats:
 * - EAN_13 (ISBN-13)
 * - EAN_8
 * - CODE_128
 * - CODE_39
 * - QR_CODE
 * - UPC_A, UPC_E
 *
 * Specifically tuned for ISBN detection (reject other formats).
 *
 * Flow:
 * 1. Request camera permission
 * 2. Start scanner with back camera (environment)
 * 3. On each frame, try to decode barcodes
 * 4. Filter for EAN_13/EAN_8 (most ISBNs are EAN-13)
 * 5. Validate format (10 or 13 digits)
 * 6. Call onScan callback
 * 7. Auto-stop after successful scan
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

export interface ScannedISBN {
  /** Raw decoded text */
  text: string;
  /** Cleaned ISBN (digits only, 10 or 13) */
  isbn: string;
  /** Format detected */
  format: string;
  /** Timestamp */
  timestamp: string;
}

export interface UseIsbnScannerOptions {
  /** Called when ISBN detected */
  onScan: (data: ScannedISBN) => void;
  /** Scanner active state */
  active: boolean;
  /** Container element ID (default: auto-generated) */
  containerId?: string;
  /** Frames per second (default: 10) */
  fps?: number;
  /** Scanner region size in pixels (default: 300) */
  qrboxSize?: number;
  /** Auto-stop after first successful scan (default: true) */
  autoStop?: boolean;
}

export interface UseIsbnScannerResult {
  containerId: string;
  isScanning: boolean;
  isSupported: boolean;
  error: string | null;
  permission: "unknown" | "granted" | "denied" | "prompt";
  start: () => Promise<void>;
  stop: () => Promise<void>;
  requestPermission: () => Promise<boolean>;
  switchCamera: () => Promise<void>;
}

export function useIsbnScanner(options: UseIsbnScannerOptions): UseIsbnScannerResult {
  const {
    onScan,
    active,
    containerId = `isbn-scanner-${Math.random().toString(36).slice(2, 9)}`,
    fps = 10,
    qrboxSize = 300,
    autoStop = true,
  } = options;

  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<UseIsbnScannerResult["permission"]>("unknown");
  const [cameraIndex, setCameraIndex] = useState(0);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  const hasScannedRef = useRef(false);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  // Check browser support
  const isSupported = typeof window !== "undefined" &&
    !!navigator.mediaDevices &&
    !!navigator.mediaDevices.getUserMedia;

  // Request camera permission explicitly
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError("Browser tidak support camera API");
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      // Stop tracks immediately - we just wanted permission
      stream.getTracks().forEach((t) => t.stop());
      setPermission("granted");
      return true;
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setPermission("denied");
        setError("Izin kamera ditolak. Aktifkan di pengaturan browser.");
      } else if (err.name === "NotFoundError") {
        setError("Kamera tidak ditemukan di device ini");
      } else {
        setError(`Error: ${err.message || "Unknown"}`);
      }
      return false;
    }
  }, [isSupported]);

  // Start scanner
  const start = useCallback(async () => {
    if (!isSupported) {
      setError("Camera not supported");
      return;
    }
    if (isScanning) return;
    if (hasScannedRef.current) hasScannedRef.current = false;

    try {
      const scanner = new Html5Qrcode(containerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        verbose: false,
      });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps,
          qrbox: { width: qrboxSize, height: Math.floor(qrboxSize * 0.6) },
          aspectRatio: 1.6,
          disableFlip: false,
        },
        (decodedText, decodedResult) => {
          if (hasScannedRef.current) return;
          const cleaned = decodedText.replace(/[-\s]/g, "").trim();

          // Only accept if looks like ISBN (10 or 13 digits, mostly numeric)
          if (!/^\d{10}(\d{3})?$/.test(cleaned)) {
            // Not ISBN — could be a product barcode. Continue scanning.
            return;
          }

          hasScannedRef.current = true;
          const data: ScannedISBN = {
            text: decodedText,
            isbn: cleaned,
            format: decodedResult?.result?.format?.formatName || "UNKNOWN",
            timestamp: new Date().toISOString(),
          };

          onScanRef.current(data);

          if (autoStop) {
            scanner.stop().catch(() => {
              // ignore
            });
          }
        },
        () => {
          // Per-frame error (no barcode found in this frame) - ignore
        }
      );
      setIsScanning(true);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Gagal memulai scanner");
      setIsScanning(false);
    }
  }, [isSupported, containerId, fps, qrboxSize, autoStop, isScanning]);

  // Stop scanner
  const stop = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch {
        // ignore
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  }, []);

  // Switch between front/back camera
  const switchCamera = useCallback(async () => {
    if (!scannerRef.current) return;
    await stop();
    setCameraIndex((i) => (i === 0 ? 1 : 0));
    // Restart with new camera
    setTimeout(() => start(), 100);
  }, [stop, start]);

  // Auto-start when active
  useEffect(() => {
    if (active && isSupported && !isScanning) {
      start();
    } else if (!active && isScanning) {
      stop();
    }
    return () => {
      // Cleanup on unmount
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {
          // ignore
        });
        scannerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return {
    containerId,
    isScanning,
    isSupported,
    error,
    permission,
    start,
    stop,
    requestPermission,
    switchCamera,
  };
}
