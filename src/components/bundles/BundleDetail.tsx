import React from "react";
import Link from "next/link";
import { Card } from "@/components/shared/Card";
import { ChannelTile } from "@/components/shared/ChannelTile";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { BundleDetailItem } from "@/server/bundles";
import { AlertCircle, ExternalLink, Plus, Copy, PackagePlus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BundleDetailProps {
  bundle: BundleDetailItem;
}

export function BundleDetail({ bundle }: BundleDetailProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-6">
        {/* 1. Header with Swatch, Name, SKU, Channels, and Action Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-hairline">
          <div className="flex items-start gap-3.5">
            <div
              className="w-12 h-12 rounded-[10px] border border-line shrink-0 shadow-xs flex items-center justify-center"
              style={{ backgroundColor: bundle.swatch ?? "#EBF8FF" }}
              aria-hidden="true"
            />
            <div className="space-y-1 min-w-0">
              <h1 className="font-heading text-2xl font-bold tracking-tight text-ink">
                {bundle.name}
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-semibold bg-ground border border-line px-2 py-0.5 rounded-[5px] text-ink">
                  {bundle.sku}
                </span>
                {bundle.category && (
                  <span className="text-xs text-muted bg-ground px-2 py-0.5 rounded-[5px]">
                    {bundle.category}
                  </span>
                )}
                {bundle.channels.length > 0 && (
                  <div className="flex items-center gap-1.5 ml-1">
                    {bundle.channels.map((c) => (
                      <ChannelTile
                        key={c.id}
                        type={c.type}
                        name={c.name}
                        showLabel
                        size="xs"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons (Disabled with Coming Soon tooltip) */}
          <div className="flex items-center gap-2 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="outline"
                    disabled
                    className="gap-1.5 opacity-60 cursor-not-allowed"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add component</span>
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Coming soon</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="outline"
                    disabled
                    className="gap-1.5 opacity-60 cursor-not-allowed"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy components to…</span>
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Coming soon</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* 2. Black "Available to sell" card */}
        <div className="rounded-[14px] bg-sidebar-bg text-white p-6 shadow-sm border border-sidebar-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-sidebar-dim">
                Available to sell
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-mono font-bold text-white tabular-nums">
                  {bundle.available}
                </span>
                <span className="text-sidebar-dim text-sm font-sans">
                  sets ready to fulfill
                </span>
              </div>

              {bundle.limitingComponentName && (
                <p className="text-xs text-sidebar-text pt-1 font-medium">
                  Limited by{" "}
                  <strong className="text-warn font-semibold">
                    {bundle.limitingComponentName}
                  </strong>{" "}
                  ({bundle.limitingComponentSets} sets)
                </p>
              )}

              {bundle.isSplitAcrossWarehouses && (
                <p className="text-xs text-sidebar-dim pt-0.5 italic">
                  Parts are split across warehouses: only {bundle.available} complete{" "}
                  {bundle.available === 1 ? "set" : "sets"} in one place.
                </p>
              )}
            </div>

            {/* Reorder Limiting Part button */}
            <div className="shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      variant="outline"
                      disabled
                      className="border-sidebar-border bg-sidebar-raised text-sidebar-text hover:bg-sidebar-raised opacity-60 cursor-not-allowed gap-1.5"
                    >
                      <PackagePlus className="w-4 h-4 text-sidebar-dim" />
                      <span>Reorder limiting part</span>
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Coming soon</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* 3. Component Breakdown Section */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-hairline">
            <div>
              <h2 className="font-heading text-base font-semibold text-ink">
                Bundle components
              </h2>
              <p className="text-xs text-muted">
                {bundle.components.length} components required per set. Availability is constrained by the limiting component.
              </p>
            </div>
            <span className="text-xs font-mono text-muted">
              Smallest component sets bundle stock
            </span>
          </div>

          <div className="space-y-3">
            {bundle.components.map((comp) => {
              const barPercent = Math.max(
                4,
                Math.round((comp.sets / bundle.maxSets) * 100)
              );

              return (
                <div
                  key={comp.componentId}
                  className={cn(
                    "rounded-[12px] p-4 transition-all space-y-3",
                    comp.isLimiting
                      ? "border border-warn-border bg-warn-soft/20 shadow-2xs"
                      : "border border-line bg-surface"
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Component Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-8 h-8 rounded-[6px] border border-line shrink-0"
                        style={{ backgroundColor: comp.swatch ?? "#F4F5F7" }}
                        aria-hidden="true"
                      />
                      <div className="min-w-0 space-y-0.5">
                        <Link
                          href={`/inventory/${encodeURIComponent(comp.sku)}`}
                          className="font-heading text-sm font-semibold text-ink hover:text-accent flex items-center gap-1.5 group truncate"
                        >
                          <span>{comp.name}</span>
                          <ExternalLink className="w-3.5 h-3.5 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                        <span className="font-mono text-xs text-muted">
                          {comp.sku}
                        </span>
                      </div>
                    </div>

                    {/* Stock Math & Sets */}
                    <div className="flex sm:flex-col sm:items-end gap-2 sm:gap-0.5">
                      <div className="flex items-baseline gap-1.5 font-mono">
                        <span
                          className={cn(
                            "text-lg font-bold tabular-nums",
                            comp.isLimiting ? "text-warn-text" : "text-ink"
                          )}
                        >
                          {comp.sets}
                        </span>
                        <span className="text-xs text-muted font-sans font-medium">
                          {comp.sets === 1 ? "set" : "sets"}
                        </span>
                      </div>
                      <span className="text-xs text-muted font-mono tabular-nums">
                        {comp.available} available ÷ {comp.qtyPerSet} per set
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-ground h-2 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${barPercent}%` }}
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        comp.isHeldByCloseAt
                          ? "bg-accent"
                          : comp.isLimiting
                          ? comp.sets === 0
                            ? "bg-bad"
                            : "bg-warn"
                          : "bg-ink/75"
                      )}
                    />
                  </div>

                  {/* Footnote on limiting component */}
                  {comp.isHeldByCloseAt ? (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-accent pt-0.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Held by close-at threshold</span>
                    </div>
                  ) : comp.isLimiting ? (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-warn-text pt-0.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>This part sets the bundle&apos;s stock.</span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </TooltipProvider>
  );
}
