import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

export interface UseQrScannerResult {
  containerId: string;
}

export function useQrScanner(
  onScan: (text: string) => void,
  active: boolean,
  containerId: string = "qr-scanner-container"
): UseQrScannerResult {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!active) {
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => {
          scannerRef.current?.clear();
          scannerRef.current = null;
        }).catch(() => {
          scannerRef.current = null;
        });
      }
      return;
    }

    const startScanner = async () => {
      try {
        const scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            onScanRef.current(decodedText);
          },
          () => {
            // Ignore per-frame errors
          }
        );
      } catch {
        // Camera not available — user can use manual input
      }
    };
    startScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => {
          scannerRef.current?.clear();
          scannerRef.current = null;
        }).catch(() => {
          scannerRef.current = null;
        });
      }
    };
  }, [active, containerId]);

  return { containerId };
}
