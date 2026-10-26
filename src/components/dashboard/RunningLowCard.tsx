import React from "react";
import Link from "next/link";
import { Card } from "@/components/shared/Card";
import { StatusPill } from "@/components/shared/StatusPill";
import type { DashboardRunningLowItem } from "@/server/dashboard";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RunningLowCardProps {
  items: DashboardRunningLowItem[];
}

export function RunningLowCard({ items }: RunningLowCardProps) {
  return (
    <Card className="p-0 overflow-hidden flex flex-col justify-between">
      <div>
        <div className="px-5 py-4 border-b border-hairline flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warn" />
            <h2 className="font-heading text-base font-semibold text-ink">
              Running low
            </h2>
          </div>
          <Link
            href="/inventory?view=low_stock"
            className="text-xs font-medium text-accent hover:text-accent-hover flex items-center gap-1 transition-colors"
          >
            <span>View all</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted">
            All inventory levels are currently healthy with sufficient runway.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse min-w-[500px]">
              <thead>
                <tr className="border-b border-hairline bg-ground/50 text-xs font-semibold text-muted uppercase tracking-wider">
                  <th className="py-2.5 px-5">Product</th>
                  <th className="py-2.5 px-4 text-right">Available</th>
                  <th className="py-2.5 px-4 w-44">Stock Runway</th>
                  <th className="py-2.5 px-5 text-center min-w-[120px]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {items.map((item) => {
                  const isRed = item.daysOfStockLeft <= 5;
                  const isAmber = !isRed && item.daysOfStockLeft <= 14;
                  const barPercent = Math.min(
                    100,
                    Math.round((item.daysOfStockLeft / 30) * 100)
                  );

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-ground/40 transition-colors"
                    >
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-[6px] border border-line shrink-0"
                            style={{
                              backgroundColor: item.swatch ?? "#3155F5",
                            }}
                            aria-hidden="true"
                          />
                          <div className="min-w-0">
                            <Link
                              href={`/inventory/${encodeURIComponent(item.sku)}`}
                              className="font-medium text-xs text-ink hover:text-accent truncate block"
                            >
                              {item.name}
                            </Link>
                            <span className="font-mono text-[11px] text-muted">
                              {item.sku}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-xs tabular-nums text-ink">
                        {item.available}
                      </td>

                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span
                              className={cn(
                                "font-semibold",
                                isRed
                                  ? "text-bad"
                                  : isAmber
                                  ? "text-warn-text"
                                  : "text-muted"
                              )}
                            >
                              {item.daysOfStockLeft}d left
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-ground overflow-hidden">
                            <div
                              style={{ width: `${barPercent}%` }}
                              className={cn(
                                "h-full rounded-full transition-all",
                                isRed
                                  ? "bg-bad"
                                  : isAmber
                                  ? "bg-warn"
                                  : "bg-good"
                              )}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-5 text-center min-w-[120px]">
                        <StatusPill status={item.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="p-3 px-5 border-t border-hairline bg-ground/30">
        <span className="text-[11px] text-muted">
          Prioritized by days of stock runway based on 30-day order velocity
        </span>
      </div>
    </Card>
  );
}
