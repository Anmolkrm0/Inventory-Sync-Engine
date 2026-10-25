import React from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/shared/Card";

export default function ConnectPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Step 1 of 4"
        title="Connect Sales Channels"
        description="Link your stores to start syncing stock levels automatically."
      />
      <Card className="p-8">
        <p className="text-sm text-muted">
          Connect wizard 4-step stepper and channel cards grid will be rendered here in Phase 8.
        </p>
      </Card>
    </div>
  );
}
