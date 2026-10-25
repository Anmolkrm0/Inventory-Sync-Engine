import React from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/shared/Card";

export default function BundlesPage() {
  return (
    <div>
      <PageHeader
        title="Bundles"
        description="Multi-item bundles with real-time component availability calculation."
      />
      <Card className="p-8">
        <p className="text-sm text-muted">
          Bundle breakdown and limiting component view will be rendered here in Phase 7.
        </p>
      </Card>
    </div>
  );
}
