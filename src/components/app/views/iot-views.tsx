"use client";

/**
 * IoT RFID Views — Wrapper untuk RFID simulator dan dashboard.
 */

import { Radio, Activity } from "lucide-react";
import { PageHeader } from "@/components/app/shared/page-header";
import { RFIDSimulator } from "@/components/app/iot/rfid-simulator";
import { RFIDDashboard } from "@/components/app/iot/rfid-dashboard";

export function RFIDSImulatorView() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="RFID Simulator"
        description="Simulasikan tap kartu RFID untuk testing tanpa hardware"
        icon={Radio}
      />
      <RFIDSimulator />
    </div>
  );
}

export function RFIDDashboardView() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="RFID Dashboard"
        description="Real-time monitoring aktivitas RFID perpustakaan"
        icon={Activity}
      />
      <RFIDDashboard />
    </div>
  );
}
