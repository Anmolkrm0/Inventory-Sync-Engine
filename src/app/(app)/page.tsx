import React from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiTile } from "@/components/shared/KpiTile";
import { Card } from "@/components/shared/Card";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        eyebrow="Precision Control Room"
        description="Real-time multi-channel stock sync and performance monitoring."
        actions={
          <Button variant="ink" size="sm" className="gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Adjust stock
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile
          label="Available units"
          value="916"
          change="+12 today"
          changeType="good"
          note="Across 3 warehouses"
          sparkline={[20, 24, 22, 28, 30, 26, 32, 35, 34, 38, 42, 40, 45, 48]}
          sparklineColor="accent"
        />
        <KpiTile
          label="Orders synced today"
          value="38"
          change="99.9% success"
          changeType="good"
          note="1.8s median push"
          sparkline={[5, 8, 12, 10, 15, 14, 18, 22, 20, 25, 28, 32, 30, 38]}
          sparklineColor="good"
        />
        <KpiTile
          label="Low-stock SKUs"
          value="2"
          change="Needs review"
          changeType="warn"
          note="Mug & Linen Tote"
          sparkline={[1, 1, 2, 2, 1, 1, 2, 3, 2, 2, 3, 2, 2, 2]}
          sparklineColor="warn"
        />
        <KpiTile
          label="Oversells prevented"
          value="14"
          change="Past 30 days"
          changeType="neutral"
          note="Held-at-0 close-at rules"
          sparkline={[0, 1, 0, 2, 1, 0, 1, 2, 1, 1, 2, 1, 1, 1]}
          sparklineColor="ink"
        />
      </div>

      <Card className="p-8">
        <h2 className="text-lg font-bold font-heading text-ink">Sync Stream & Overview</h2>
        <p className="mt-1 text-sm text-muted">
          Dashboard 24h order chart, channels list, running low table, and live feed will be populated in Phase 8.
        </p>
      </Card>
    </div>
  );
}
