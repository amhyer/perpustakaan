"use client";

/**
 * Blockchain Explorer View wrapper.
 */

import { Link2 } from "lucide-react";
import { PageHeader } from "@/components/app/shared/page-header";
import { BlockchainExplorer } from "@/components/app/blockchain/blockchain-explorer";

export function BlockchainExplorerView() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Blockchain Audit"
        description="Hash-chained immutable audit trail untuk compliance & forensics"
        icon={Link2}
      />
      <BlockchainExplorer />
    </div>
  );
}
