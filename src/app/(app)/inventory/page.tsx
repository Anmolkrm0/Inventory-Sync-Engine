import React from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/shared/Card";

export default function InventoryPage() {
  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Master stock control across all warehouses with real-time sales channel push."
      />
      <Card className="p-8">
        <p className="text-sm text-muted">
          Inventory view table will be rendered here in Phase 5.
        </p>
      </Card>
    </div>
  );
}
