"use client";

/**
 * PickupCode — Tampilkan kode ambil hadiah dengan QR code.
 *
 * Pustakawan bisa:
 * - Scan QR dengan HP
 * - Atau input kode manual di search
 *
 * QR code berisi URL: /admin/redeem?code=RWD-XXXXX
 * (Scan → langsung ke halaman input)
 */

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/form/button";
import { cn } from "@/lib/utils";

interface PickupCodeProps {
  code: string;
  variant?: "compact" | "full";
  className?: string;
}

export function PickupCode({ code, variant = "compact", className }: PickupCodeProps) {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Kode disalin!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (variant === "full") {
    return (
      <div className={cn("flex flex-col items-center gap-3", className)}>
        <div className="bg-white p-3 rounded-lg border-2 border-dashed border-green-500">
          <QRCodeSVG
            value={`${typeof window !== "undefined" ? window.location.origin : ""}/admin/redeem?code=${code}`}
            size={160}
            level="M"
            includeMargin={false}
          />
        </div>
        <div className="flex items-center gap-2">
          <code className="bg-white border-2 border-dashed border-green-500 px-4 py-2 rounded-md font-mono text-base font-bold text-green-700">
            {code}
          </code>
          <Button size="sm" variant="outline" onClick={copyCode}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <div className="text-xs text-slate-500 flex items-center gap-1.5">
          <ScanLine className="h-3 w-3" />
          <span>Pustakawan bisa scan QR atau input kode di atas</span>
        </div>
      </div>
    );
  }

  // Compact
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <code className="bg-white border-2 border-dashed border-green-500 px-3 py-1.5 rounded-md font-mono text-sm font-bold text-green-700">
        {code}
      </code>
      <Button size="sm" variant="ghost" onClick={copyCode} className="h-7 w-7 p-0">
        {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
      </Button>
    </div>
  );
}
