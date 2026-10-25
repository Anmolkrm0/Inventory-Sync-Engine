import React from "react";
import { cn } from "@/lib/utils";

export interface MiniBarsProps extends React.HTMLAttributes<HTMLDivElement> {
  values: number[];
  color?: "accent" | "ink" | "good" | "warn" | "bad" | "muted";
  height?: number;
  highlightLast?: boolean;
}

const colorMap = {
  accent: "bg-accent",
  ink: "bg-ink",
  good: "bg-good",
  warn: "bg-warn",
  bad: "bg-bad",
  muted: "bg-muted/40",
};

export function MiniBars({
  values,
  color = "accent",
  height = 28,
  highlightLast = false,
  className,
  ...props
}: MiniBarsProps) {
  const max = Math.max(...values, 1);

  return (
    <div
      className={cn("flex items-end gap-1 select-none", className)}
      style={{ height: `${height}px` }}
      aria-hidden="true"
      {...props}
    >
      {values.map((val, idx) => {
        const isLast = idx === values.length - 1;
        const normalizedHeight = Math.max(3, Math.round((val / max) * height));
        const barColor =
          highlightLast && isLast
            ? "bg-ink"
            : colorMap[color];

        return (
          <div
            key={idx}
            className={cn("w-1.5 rounded-t-[2px] transition-all", barColor)}
            style={{ height: `${normalizedHeight}px` }}
            title={`${val}`}
          />
        );
      })}
    </div>
  );
}
