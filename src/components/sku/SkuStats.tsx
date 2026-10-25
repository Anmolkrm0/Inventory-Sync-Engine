import React from "react";
import { Card } from "@/components/shared/Card";
import { cn } from "@/lib/utils";

export interface SkuStatsProps {
  stats: {
    inStock: number;
    booked: number;
    available: number;
    incoming: number;
    daysOfStockLeft: number | null;
  };
}

export function SkuStats({ stats }: SkuStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
      {/* 1. In Stock */}
      <Card className="flex flex-col justify-between">
        <span className="text-xs font-medium text-muted">In stock (On hand)</span>
        <div className="mt-3">
          <span className="text-2xl sm:text-3xl font-mono font-bold tabular-nums text-ink">
            {stats.inStock}
          </span>
          <p className="text-[11px] text-muted mt-1">Physical inventory</p>
        </div>
      </Card>

      {/* 2. Booked */}
      <Card className="flex flex-col justify-between">
        <span className="text-xs font-medium text-muted">Booked (Reserved)</span>
        <div className="mt-3">
          <span className="text-2xl sm:text-3xl font-mono font-bold tabular-nums text-muted">
            {stats.booked}
          </span>
          <p className="text-[11px] text-muted mt-1">Pending fulfillment</p>
        </div>
      </Card>

      {/* 3. Available (Highlighted with 2px accent border and accent.soft background) */}
      <div
        className={cn(
          "rounded-[14px] border-2 border-accent bg-accent-soft p-5 flex flex-col justify-between relative shadow-xs"
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-accent-text">
            Available
          </span>
          <span className="text-[10px] font-semibold bg-accent text-white px-2 py-0.5 rounded-full">
            Live sync
          </span>
        </div>
        <div className="mt-3">
          <span className="text-2xl sm:text-3xl font-mono font-bold tabular-nums text-accent-text">
            {stats.available}
          </span>
          <p className="text-[11px] text-accent-text/80 font-medium mt-1">
            Available to sell
          </p>
        </div>
      </div>

      {/* 4. Incoming */}
      <Card className="flex flex-col justify-between">
        <span className="text-xs font-medium text-muted">Incoming</span>
        <div className="mt-3">
          <span className="text-2xl sm:text-3xl font-mono font-bold tabular-nums text-ink">
            {stats.incoming}
          </span>
          <p className="text-[11px] text-muted mt-1">Open purchase orders</p>
        </div>
      </Card>

      {/* 5. Days of stock left (in warn colors) */}
      <div
        className={cn(
          "rounded-[14px] border border-warn-border bg-warn-soft p-5 flex flex-col justify-between"
        )}
      >
        <span className="text-xs font-semibold text-warn-text uppercase tracking-wider">
          Stock runway
        </span>
        <div className="mt-3">
          <span className="text-2xl sm:text-3xl font-mono font-bold tabular-nums text-warn-text">
            {stats.daysOfStockLeft !== null ? `${stats.daysOfStockLeft}d` : "—"}
          </span>
          <p className="text-[11px] text-warn-text/80 font-medium mt-1">
            {stats.daysOfStockLeft !== null
              ? "Days left at current velocity"
              : "No recent sales velocity"}
          </p>
        </div>
      </div>
    </div>
  );
}
