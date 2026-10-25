import React from "react";
import { Card } from "@/components/shared/Card";
import { MiniBars } from "@/components/shared/MiniBars";
import { cn } from "@/lib/utils";

export interface KpiTileProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: "good" | "warn" | "accent" | "bad" | "neutral";
  note?: string;
  subtitle?: string;
  sparkline?: number[];
  sparklineColor?: "accent" | "ink" | "good" | "warn" | "bad" | "muted";
  className?: string;
}

const pillStyles: Record<string, string> = {
  good: "bg-good-soft text-good-text",
  warn: "bg-warn-soft text-warn-text",
  accent: "bg-accent-soft text-accent-text",
  bad: "bg-bad-soft text-bad-text",
  neutral: "bg-ground text-muted",
};

export function KpiTile({
  label,
  value,
  change,
  changeType = "neutral",
  note,
  subtitle,
  sparkline,
  sparklineColor = "accent",
  className,
}: KpiTileProps) {
  const noteText = note ?? subtitle;

  return (
    <Card className={cn("flex flex-col justify-between", className)}>
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-muted leading-tight">
            {label}
          </span>
          {change && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums leading-none shrink-0",
                pillStyles[changeType] ?? pillStyles.neutral
              )}
            >
              {change}
            </span>
          )}
        </div>

        <div className="text-[32px] font-heading font-semibold text-ink tabular-nums tracking-[-0.02em] leading-none mt-2">
          {value}
        </div>
      </div>

      <div className="mt-3">
        {sparkline && sparkline.length > 0 && (
          <MiniBars
            values={sparkline}
            color={sparklineColor}
            height={28}
            fill
            className="w-full"
          />
        )}
        {noteText && (
          <p className="text-xs text-muted mt-2 leading-tight">
            {noteText}
          </p>
        )}
      </div>
    </Card>
  );
}
