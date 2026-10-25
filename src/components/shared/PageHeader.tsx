import React from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6",
        className
      )}
      {...props}
    >
      <div className="space-y-1">
        {eyebrow && <div className="text-xs font-semibold text-muted uppercase tracking-wider">{eyebrow}</div>}
        <h1 className="text-2xl sm:text-[28px] font-bold font-heading text-ink tracking-tight leading-tight">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted">{description}</p>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2.5 sm:shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
