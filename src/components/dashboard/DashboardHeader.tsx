"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SlidersHorizontal, Search } from "lucide-react";
import { AdjustStockDialog } from "@/components/inventory/AdjustStockDialog";
import type {
  SelectableProductOption,
  InventoryWarehouseOption,
} from "@/server/inventory";

export interface DashboardHeaderProps {
  lastPushPill: string;
  products: SelectableProductOption[];
  warehouses: InventoryWarehouseOption[];
}

export function DashboardHeader({
  lastPushPill,
  products,
  warehouses,
}: DashboardHeaderProps) {
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
      {/* Left: Status Pill */}
      <div className="flex items-center gap-2.5">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-line shadow-2xs text-xs font-semibold text-ink select-none">
          <span className="h-2 w-2 rounded-full bg-good shadow-[0_0_8px_#12A150] shrink-0" />
          <span>{lastPushPill}</span>
        </div>
      </div>

      {/* Right: Search form + Adjust stock button */}
      <div className="flex items-center gap-3 shrink-0">
        <form action="/inventory" method="GET" className="relative flex items-center">
          <Search className="w-4 h-4 text-muted absolute left-3 pointer-events-none" />
          <Input
            name="q"
            placeholder="Search SKUs, names... ⌘K"
            className="pl-9 pr-10 w-52 sm:w-64 h-[42px] text-xs bg-surface border-line rounded-[10px]"
          />
          <kbd className="absolute right-3 text-[10px] font-mono text-muted border border-line bg-ground px-1.5 py-0.5 rounded pointer-events-none">
            ↵
          </kbd>
        </form>

        <Button
          variant="ink"
          onClick={() => setIsAdjustOpen(true)}
          className="gap-2 h-[42px] rounded-[10px] shadow-xs cursor-pointer"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Adjust stock</span>
        </Button>
      </div>

      {/* Working Adjust Stock Dialog */}
      <AdjustStockDialog
        open={isAdjustOpen}
        onOpenChange={setIsAdjustOpen}
        products={products}
        warehouses={warehouses}
      />
    </div>
  );
}
