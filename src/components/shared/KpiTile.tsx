import React from "react";
import { Card } from "@/components/shared/Card";
import { MiniBars } from "@/components/shared/MiniBars";
import { cn } from "@/lib/utils";

export interface KpiTileProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: "good" | "warn" | "bad" | "neutral";
  subtitle?: string;
  sparkline?: number[];
  sparklineColor?: "accent" | "ink" | "good" | "warn" | "bad" | "muted";
  className?: string;
}

export function KpiTile({
  label,
  value,
  change,
  changeType = "neutral",
  subtitle,
  sparkline,
  sparklineColor = "accent",
  className,
}: KpiTileProps) {
  const changeColor = {
    good: "text-good font-medium",
    warn: "text-warn-text font-medium",
    bad: "text-bad-text font-medium",
    neutral: "text-muted",
  }[changeType];

  return (
    <Card className={cn("flex flex-col justify-between gap-4", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted uppercase tracking-wider">
          {label}
        </span>
        {change && (
          <span className={cn("text-xs tabular-nums", changeColor)}>
            {change}
          </span>
        )}
      </div>

      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-3xl font-bold font-heading text-ink tabular-nums tracking-tight">
            {value}
          </div>
          {subtitle && (
            <p className="mt-1 text-xs text-muted">{subtitle}</p>
          )}
        </div>

        {sparkline && sparkline.length > 0 && (
          <div className="shrink-0 mb-1">
            <MiniBars values={sparkline} color={sparklineColor} height={26} />
          </div>
        )}
      </div>
    </Card>
  );
}
