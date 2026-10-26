"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { InventoryTabCounts } from "@/server/inventory";
import { cn } from "@/lib/utils";

export interface InventoryTabsProps {
  counts: InventoryTabCounts;
  currentView: string;
}

interface TabDef {
  key: string;
  label: string;
  count: number;
}

export function InventoryTabs({ counts, currentView }: InventoryTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabs: TabDef[] = [
    { key: "all", label: "All SKUs", count: counts.all },
    { key: "low_stock", label: "Low stock", count: counts.low_stock },
    { key: "sold_out", label: "Sold out", count: counts.sold_out },
    { key: "held", label: "Held by close-at", count: counts.held },
    { key: "unlinked", label: "Unlinked listings", count: counts.unlinked },
  ];

  const handleTabChange = (key: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "all") {
      params.delete("view");
    } else {
      params.set("view", key);
    }
    router.replace(`/inventory?${params.toString()}`);
  };

  return (
    <div
      className="flex items-center gap-1.5 overflow-x-auto pb-1 select-none scrollbar-none w-full max-w-full min-w-0"
      role="tablist"
      aria-label="Saved Views"
    >
      {tabs.map((tab) => {
        const isActive =
          currentView === tab.key || (currentView === "" && tab.key === "all");

        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => handleTabChange(tab.key)}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-[10px] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
              isActive
                ? "bg-surface text-ink border border-line shadow-xs"
                : "text-muted hover:text-ink hover:bg-surface/60"
            )}
          >
            <span>{tab.label}</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-mono tabular-nums leading-none",
                isActive
                  ? "bg-accent/10 text-accent font-bold"
                  : "bg-line/60 text-muted"
              )}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
