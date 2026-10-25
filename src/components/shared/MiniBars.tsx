import React from "react";
import { cn } from "@/lib/utils";

export interface MiniBarsProps extends React.HTMLAttributes<HTMLDivElement> {
  values: number[];
  color?: "accent" | "ink" | "good" | "warn" | "bad" | "muted";
  height?: number;
  highlightLast?: boolean;
  fill?: boolean;
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
  fill = false,
  className,
  ...props
}: MiniBarsProps) {
  const max = Math.max(...values, 1);

  return (
    <div
      className={cn(
        "flex items-end select-none",
        fill ? "w-full gap-[3px]" : "gap-1",
        className
      )}
      style={{ height: `${height}px` }}
      aria-hidden="true"
      {...props}
    >
      {values.map((val, idx) => {
        const isLast = idx === values.length - 1;
        const normalizedHeight = Math.max(3, Math.round((val / max) * height));
        const barColor =
          highlightLast && isLast ? "bg-ink" : colorMap[color];

        return (
          <div
            key={idx}
            className={cn(
              "rounded-t-[2px] transition-all",
              fill ? "flex-1 min-w-0" : "w-1.5",
              barColor
            )}
            style={{ height: `${normalizedHeight}px` }}
            title={`${val}`}
          />
        );
      })}
    </div>
  );
}
