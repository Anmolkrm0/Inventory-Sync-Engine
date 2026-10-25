"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SlidersHorizontal, ShieldAlert, RefreshCw, Download, X } from "lucide-react";

export interface FloatingBulkActionBarProps {
  selectedCount: number;
  onAdjust: () => void;
  onClear: () => void;
}

export function FloatingBulkActionBar({
  selectedCount,
  onAdjust,
  onClear,
}: FloatingBulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <TooltipProvider delayDuration={150}>
      <aside
        role="region"
        aria-label="Bulk actions bar"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-full bg-sidebar-bg border border-sidebar-border shadow-2xl text-white animate-in fade-in slide-in-from-bottom-5 duration-200 select-none max-w-[95vw] overflow-x-auto"
      >
        {/* Selected Count Pill */}
        <div className="flex items-center gap-2 pr-2 border-r border-sidebar-border shrink-0">
          <span className="flex items-center justify-center h-6 min-w-6 px-1.5 rounded-full bg-accent text-[11px] font-bold font-mono text-white tabular-nums">
            {selectedCount}
          </span>
          <span className="text-xs font-semibold text-white whitespace-nowrap">
            selected
          </span>
        </div>

        {/* Working action: Adjust stock */}
        <Button
          type="button"
          size="sm"
          variant="accent"
          onClick={onAdjust}
          className="h-8 px-3 rounded-full gap-1.5 text-xs font-semibold shrink-0 cursor-pointer"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>Adjust stock</span>
        </Button>

        {/* Disabled action: Hold at 0 with Tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className="inline-block">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled
                className="h-8 px-3 rounded-full gap-1.5 text-xs text-sidebar-dim opacity-50 cursor-not-allowed shrink-0"
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>Hold at 0</span>
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">Coming soon</TooltipContent>
        </Tooltip>

        {/* Disabled action: Sync now with Tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className="inline-block">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled
                className="h-8 px-3 rounded-full gap-1.5 text-xs text-sidebar-dim opacity-50 cursor-not-allowed shrink-0"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Sync now</span>
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">Coming soon</TooltipContent>
        </Tooltip>

        {/* Disabled action: Export CSV with Tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className="inline-block">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled
                className="h-8 px-3 rounded-full gap-1.5 text-xs text-sidebar-dim opacity-50 cursor-not-allowed shrink-0"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export CSV</span>
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">Coming soon</TooltipContent>
        </Tooltip>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={onClear}
          className="p-1 rounded-full text-sidebar-dim hover:text-white hover:bg-sidebar-raised transition-colors cursor-pointer ml-1 shrink-0"
          aria-label="Clear selection"
        >
          <X className="h-4 w-4" />
        </button>
      </aside>
    </TooltipProvider>
  );
}
