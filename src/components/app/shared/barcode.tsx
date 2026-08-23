"use client";

import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";

interface BarcodeProps {
  value: string;
  format?: "CODE128" | "CODE39" | "EAN13" | "EAN8" | "UPC" | "ITF14";
  width?: number;
  height?: number;
  fontSize?: number;
  displayValue?: boolean;
  background?: string;
  lineColor?: string;
  margin?: number;
  className?: string;
}

/**
 * Barcode component (Code 128 default).
 *
 * Formats supported:
 * - CODE128 (default, alphanumeric)
 * - CODE39 (alphanumeric, no lowercase)
 * - EAN13 / EAN8 / UPC (product barcodes, fixed length)
 * - ITF14 (numeric, 14 digits)
 *
 * Untuk ISBN/eksemplar sekolah → CODE128 lebih fleksibel.
 *
 * Note: QrCode component ada di file terpisah (./qr-code.tsx) untuk
 * avoid duplicate export.
 */
export function Barcode({
  value,
  format = "CODE128",
  width = 2,
  height = 60,
  fontSize = 14,
  displayValue = true,
  background = "#ffffff",
  lineColor = "#000000",
  margin = 4,
  className,
}: BarcodeProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    if (!value) {
      setError("Nilai barcode kosong");
      return;
    }

    try {
      JsBarcode(svgRef.current, value, {
        format,
        width,
        height,
        fontSize,
        displayValue,
        background,
        lineColor,
        margin,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal generate barcode");
    }
  }, [value, format, width, height, fontSize, displayValue, background, lineColor, margin]);

  if (error) {
    return (
      <div className={`text-xs text-destructive ${className || ""}`}>
        ⚠ Barcode error: {error}
      </div>
    );
  }

  return <svg ref={svgRef} className={className} />;
}
