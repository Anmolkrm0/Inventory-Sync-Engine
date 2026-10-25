import React from "react";
import { type StockStatus } from "@/server/stock";
import { cn } from "@/lib/utils";

export interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: StockStatus;
  showDot?: boolean;
}

const statusStyles: Record<StockStatus, { container: string; dot: string }> = {
  Healthy: {
    container: "bg-good-soft text-good-text border border-good/20",
    dot: "bg-good",
  },
  "Low stock": {
    container: "bg-warn-soft text-warn-text border border-warn-border",
    dot: "bg-warn",
  },
  "Sold out": {
    container: "bg-bad-soft text-bad-text border border-bad/20",
    dot: "bg-bad",
  },
  "Held at 0": {
    container: "bg-accent-soft text-accent-text border border-accent/20",
    dot: "bg-accent",
  },
};

export function StatusPill({
  status,
  showDot = false,
  className,
  ...props
}: StatusPillProps) {
  const style = statusStyles[status] ?? statusStyles.Healthy;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold leading-none select-none tracking-tight",
        style.container,
        className
      )}
      {...props}
    >
      {showDot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full mr-1.5 shrink-0", style.dot)}
          aria-hidden="true"
        />
      )}
      {status}
    </span>
  );
}
