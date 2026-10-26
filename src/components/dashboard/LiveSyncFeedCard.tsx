import React from "react";
import Link from "next/link";
import { Card } from "@/components/shared/Card";
import type { DashboardLiveFeedItem } from "@/server/dashboard";
import { Activity, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LiveSyncFeedCardProps {
  items: DashboardLiveFeedItem[];
}

export function LiveSyncFeedCard({ items }: LiveSyncFeedCardProps) {
  return (
    <Card className="p-0 overflow-hidden flex flex-col justify-between">
      <div>
        <div className="px-5 py-4 border-b border-hairline flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-muted" />
            <h2 className="font-heading text-base font-semibold text-ink">
              Live sync feed
            </h2>
          </div>
          <Link
            href="/inventory"
            className="text-xs font-medium text-accent hover:text-accent-hover flex items-center gap-1 transition-colors"
          >
            <span>All inventory</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted">
            No inventory sync movements recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-hairline">
            {items.map((item) => {
              const isPositive = item.delta > 0;
              const isNegative = item.delta < 0;
              const formattedDelta = isPositive
                ? `+${item.delta}`
                : `${item.delta}`;

              return (
                <div
                  key={item.id}
                  className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-ground/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={cn(
                        "font-mono text-xs font-bold px-2 py-0.5 rounded-[5px] shrink-0 border tabular-nums",
                        isPositive && "bg-good-soft text-good-text border-good/20",
                        isNegative && "bg-bad-soft text-bad-text border-bad/20",
                        !isPositive && !isNegative && "bg-ground text-muted border-line"
                      )}
                    >
                      {formattedDelta}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/inventory/${encodeURIComponent(item.sku)}`}
                          className="font-medium text-xs text-ink hover:text-accent truncate block"
                        >
                          {item.productName}
                        </Link>
                        <span className="text-[11px] text-muted">·</span>
                        <span className="text-[11px] text-muted truncate">
                          {item.warehouseName}
                        </span>
                      </div>
                      {item.refLabel && (
                        <p className="text-[11px] text-muted/80 truncate">
                          {item.refLabel}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono text-[11px] text-muted">
                      {item.timeAgo}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-3 px-5 border-t border-hairline bg-ground/30">
        <span className="text-[11px] text-muted font-mono">
          Audit trail of confirmed stock changes pushed to sales channels
        </span>
      </div>
    </Card>
  );
}
