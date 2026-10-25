import React from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/shared/Card";

export default function PurchaseOrdersPage() {
  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        description="Track inbound stock receipts and supplier purchase orders."
      />
      <Card className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-base font-semibold text-ink">Coming soon</p>
        <p className="mt-1 text-sm text-muted">
          Purchase orders management will be available in the upcoming release.
        </p>
      </Card>
    </div>
  );
}
