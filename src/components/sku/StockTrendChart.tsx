"use client";

import React, { useState } from "react";
import { Card } from "@/components/shared/Card";
import type { SkuDailyTrendPoint } from "@/server/sku";
import type { StockStatus } from "@/server/stock";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StockTrendChartProps {
  trend: SkuDailyTrendPoint[];
  status: StockStatus;
}

export function StockTrendChart({ trend, status }: StockTrendChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const maxAvailable = Math.max(...trend.map((p) => p.available), 1);
  const minAvailable = Math.min(...trend.map((p) => p.available));
  const currentAvailable = trend[trend.length - 1]?.available ?? 0;

  const isLowStock = status === "Low stock" || status === "Sold out";

  return (
    <Card className="p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted" />
            <h2 className="font-heading text-base font-semibold text-ink">
              Available — last 30 days
            </h2>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="text-muted">
              Peak: <strong className="text-ink">{maxAvailable}</strong>
            </span>
            <span className="text-muted">
              Low: <strong className="text-ink">{minAvailable}</strong>
            </span>
            <span className="text-muted">
              Now:{" "}
              <strong
                className={isLowStock ? "text-bad font-bold" : "text-accent font-bold"}
              >
                {currentAvailable}
              </strong>
            </span>
          </div>
        </div>

        {/* Chart display area */}
        <div className="h-44 pt-6 pb-2 flex items-end gap-1 sm:gap-1.5 w-full">
          {trend.map((point, idx) => {
            const isLastBar = idx === trend.length - 1;
            const barHeightPercent = Math.max(
              4,
              Math.round((point.available / maxAvailable) * 100)
            );

            // Last bar is red (bg-bad) if low stock or sold out
            const barBg = isLastBar && isLowStock ? "bg-bad hover:bg-bad/80" : "bg-accent/85 hover:bg-accent";

            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center h-full justify-end relative group cursor-pointer"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Tooltip */}
                {hoveredIndex === idx && (
                  <div className="absolute -top-10 z-20 pointer-events-none whitespace-nowrap rounded-[6px] bg-ink px-2 py-1 text-[11px] font-mono text-white shadow-md">
                    <span>
                      {point.dayLabel}: <strong>{point.available}</strong> units
                    </span>
                  </div>
                )}

                {/* Div bar */}
                <div
                  style={{ height: `${barHeightPercent}%` }}
                  className={cn(
                    "w-full rounded-t-[3px] transition-all duration-200",
                    barBg,
                    hoveredIndex === idx && "ring-2 ring-ink ring-offset-1"
                  )}
                />
              </div>
            );
          })}
        </div>

        {/* X-axis labels */}
        <div className="flex items-center justify-between text-[11px] text-muted font-mono pt-2 border-t border-hairline">
          <span>30 days ago</span>
          <span>15 days ago</span>
          <span className={cn(isLowStock && "text-bad font-semibold")}>
            Today {isLowStock ? "(Low)" : ""}
          </span>
        </div>
      </div>
    </Card>
  );
}
