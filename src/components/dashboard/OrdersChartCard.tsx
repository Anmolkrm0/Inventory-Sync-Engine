"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/shared/Card";
import type { DashboardOrdersChart, DashboardRange } from "@/server/dashboard";
import { ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OrdersChartCardProps {
  chart: DashboardOrdersChart;
}

export function OrdersChartCard({ chart }: OrdersChartCardProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const ranges: { id: DashboardRange; label: string }[] = [
    { id: "24h", label: "24 hours" },
    { id: "7d", label: "7 days" },
    { id: "30d", label: "30 days" },
  ];

  return (
    <Card className="p-5 flex flex-col justify-between">
      <div>
        {/* Header with Title and Segmented Range Control */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-hairline">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-muted" />
            <h2 className="font-heading text-base font-semibold text-ink">
              Orders synced
            </h2>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-4">
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-muted">
                Total: <strong className="text-ink font-semibold">{chart.totalUnits}</strong>
              </span>
              <span className="text-muted">
                Avg: <strong className="text-ink font-semibold">{chart.avgUnits}</strong>
              </span>
            </div>

            {/* Segmented Range Control (Server-rendered links) */}
            <div className="flex items-center p-0.5 rounded-[8px] bg-ground border border-line text-xs">
              {ranges.map((r) => {
                const isActive = chart.range === r.id;
                return (
                  <Link
                    key={r.id}
                    href={`/?range=${r.id}`}
                    scroll={false}
                    className={cn(
                      "px-2.5 py-1 rounded-[6px] font-medium transition-all select-none",
                      isActive
                        ? "bg-surface text-ink font-semibold shadow-2xs"
                        : "text-muted hover:text-ink"
                    )}
                  >
                    {r.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Div Bars Chart Display */}
        <div className="h-44 pt-8 pb-2 flex items-end gap-1 sm:gap-1.5 w-full">
          {chart.bars.map((bar, idx) => {
            const barHeight = Math.max(
              4,
              Math.round((bar.units / chart.maxUnits) * 100)
            );

            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center h-full justify-end relative group cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Tooltip */}
                {hoveredIdx === idx && (
                  <div className="absolute -top-10 z-20 pointer-events-none whitespace-nowrap rounded-[6px] bg-ink px-2 py-1 text-[11px] font-mono text-white shadow-md">
                    <span>
                      {bar.fullLabel}: <strong>{bar.units}</strong> units
                    </span>
                  </div>
                )}

                {/* Div Bar: Last bar is ink color (bg-ink), others are accent */}
                <div
                  style={{ height: `${barHeight}%` }}
                  className={cn(
                    "w-full rounded-t-[3px] transition-all duration-200",
                    bar.isCurrent
                      ? "bg-ink hover:bg-ink/80"
                      : "bg-accent/80 hover:bg-accent",
                    hoveredIdx === idx && "ring-2 ring-ink ring-offset-1"
                  )}
                />
              </div>
            );
          })}
        </div>

        {/* X-axis labels */}
        <div className="flex items-center justify-between text-[11px] text-muted font-mono pt-2 border-t border-hairline">
          <span>{chart.bars[0]?.label ?? "Start"}</span>
          <span>
            {chart.bars[Math.floor(chart.bars.length / 2)]?.label ?? "Mid"}
          </span>
          <span className="font-semibold text-ink">
            {chart.bars[chart.bars.length - 1]?.label ?? "Now"} (Now)
          </span>
        </div>
      </div>
    </Card>
  );
}
