import React from "react";
import { Card } from "@/components/shared/Card";
import type { SkuActivityItem } from "@/server/sku";
import { History } from "lucide-react";
import { cn, formatRelativeTime, formatDateTime } from "@/lib/utils";
import type { MoveReason } from "@prisma/client";

export interface ActivityLogCardProps {
  activities: SkuActivityItem[];
}

const reasonLabels: Record<MoveReason, string> = {
  ORDER: "Order fulfilled",
  CANCEL: "Order cancelled",
  RETURN: "Customer return",
  PO_RECEIVE: "PO received",
  MANUAL: "Manual adjustment",
  STOCKTAKE: "Stocktake / Cycle count",
  TRANSFER: "Warehouse transfer",
};

export function ActivityLogCard({ activities }: ActivityLogCardProps) {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-5 py-4 border-b border-hairline flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-muted" />
          <h2 className="font-heading text-base font-semibold text-ink">
            Activity log
          </h2>
        </div>
        <span className="text-xs text-muted font-mono">
          {activities.length} recent {activities.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      {activities.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted">
          No stock activity recorded for this product yet.
        </div>
      ) : (
        <div className="divide-y divide-hairline">
          {activities.map((act) => {
            const isPositive = act.delta > 0;
            const isNegative = act.delta < 0;
            const deltaFormatted = isPositive
              ? `+${act.delta}`
              : `${act.delta}`;

            const timeDistance = formatRelativeTime(act.createdAt);
            const fullDate = formatDateTime(act.createdAt);

            return (
              <div
                key={act.id}
                className="p-4 px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-ground/40 transition-colors"
              >
                {/* Left: Delta Badge + Reason & Details */}
                <div className="flex items-start gap-3 min-w-0">
                  <span
                    className={cn(
                      "font-mono text-xs font-bold px-2.5 py-1 rounded-[6px] shrink-0 border tabular-nums",
                      isPositive && "bg-good-soft text-good-text border-good/20",
                      isNegative && "bg-bad-soft text-bad-text border-bad/20",
                      !isPositive && !isNegative && "bg-ground text-muted border-line"
                    )}
                  >
                    {deltaFormatted}
                  </span>

                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-ink">
                        {reasonLabels[act.reason] ?? act.reason}
                      </span>
                      <span className="text-[11px] text-muted">·</span>
                      <span className="text-xs text-muted">
                        {act.warehouseName}
                      </span>
                    </div>

                    {(act.refLabel || act.note) && (
                      <p className="text-xs text-ink/90 font-medium truncate">
                        {act.refLabel ?? act.note}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Timestamp */}
                <div className="flex sm:flex-col sm:items-end text-xs text-muted font-mono shrink-0">
                  <span title={fullDate}>{timeDistance}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
