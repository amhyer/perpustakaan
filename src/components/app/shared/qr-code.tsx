"use client";

import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";

interface QrCodeProps {
  value: string;
  size?: number;
  className?: string;
  bgColor?: string;
  fgColor?: string;
  includeMargin?: boolean;
}

export function QrCode({
  value,
  size = 128,
  className,
  bgColor = "#ffffff",
  fgColor = "#1e3a5f",
  includeMargin = false,
}: QrCodeProps) {
  return (
    <div className={cn("inline-block", className)}>
      <QRCodeSVG
        value={value}
        size={size}
        bgColor={bgColor}
        fgColor={fgColor}
        level="M"
        marginSize={includeMargin ? 2 : 0}
        className="rounded"
      />
    </div>
  );
}
