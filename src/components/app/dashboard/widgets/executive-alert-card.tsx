"use client";

import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/layout/card";
import { formatRupiah } from "@/lib/constants";

interface ExecutiveAlertCardProps {
  totalOverdue: number;
  totalFineOutstanding: number;
}

/**
 * Alert card untuk hal yang butuh perhatian stakeholder.
 */
export function ExecutiveAlertCard({
  totalOverdue,
  totalFineOutstanding,
}: ExecutiveAlertCardProps) {
  if (totalOverdue === 0 && totalFineOutstanding === 0) return null;

  return (
    <Card className="p-5 border-amber-200 bg-amber-50">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700 shrink-0">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-amber-900">Perhatian Diperlukan</h3>
          <ul className="text-sm text-amber-800 mt-2 space-y-1">
            {totalOverdue > 0 && (
              <li>• {totalOverdue} buku terlambat dikembalikan</li>
            )}
            {totalFineOutstanding > 0 && (
              <li>• Total denda tertunggak: {formatRupiah(totalFineOutstanding)}</li>
            )}
          </ul>
        </div>
      </div>
    </Card>
  );
}
