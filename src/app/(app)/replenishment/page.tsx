import React from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/shared/Card";

export default function ReplenishmentPage() {
  return (
    <div>
      <PageHeader
        title="Replenishment"
        description="Automated stock level reordering and low-stock replenishment recommendations."
      />
      <Card className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-base font-semibold text-ink">Coming soon</p>
        <p className="mt-1 text-sm text-muted">
          Smart replenishment engine will be available in the upcoming release.
        </p>
      </Card>
    </div>
  );
}
