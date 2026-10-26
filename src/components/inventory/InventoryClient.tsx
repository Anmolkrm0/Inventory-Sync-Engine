"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InventoryTabs } from "@/components/inventory/InventoryTabs";
import { InventoryFilters } from "@/components/inventory/InventoryFilters";
import { InventoryTable } from "@/components/inventory/InventoryTable";
import { FloatingBulkActionBar } from "@/components/inventory/FloatingBulkActionBar";
import { AdjustStockDialog } from "@/components/inventory/AdjustStockDialog";
import {
  InventoryItem,
  UnlinkedListingItem,
  InventoryTabCounts,
  InventoryWarehouseOption,
  InventoryChannelOption,
  SelectableProductOption,
} from "@/server/inventory";
import { Upload, ClipboardList, SlidersHorizontal } from "lucide-react";

export interface InventoryClientProps {
  items: InventoryItem[];
  unlinkedListings: UnlinkedListingItem[];
  tabs: InventoryTabCounts;
  warehouses: InventoryWarehouseOption[];
  channels: InventoryChannelOption[];
  selectableProducts: SelectableProductOption[];
  currentView: string;
}

export function InventoryClient({
  items,
  unlinkedListings,
  tabs,
  warehouses,
  channels,
  selectableProducts,
  currentView,
}: InventoryClientProps) {
  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Adjust stock dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"adjust" | "set">("adjust");
  const [dialogProductId, setDialogProductId] = useState<string | undefined>(
    undefined
  );

  // Toggle selection for a single row
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle select all on screen
  const handleToggleSelectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((item) => item.id));
    }
  };

  // Open adjust stock dialog in Add/Remove mode
  const handleOpenAdjust = (preselectedProductId?: string) => {
    setDialogMode("adjust");
    setDialogProductId(preselectedProductId ?? selectedIds[0] ?? undefined);
    setDialogOpen(true);
  };

  // Open adjust stock dialog in Stocktake ("Set exact") mode
  const handleOpenStocktake = () => {
    setDialogMode("set");
    setDialogProductId(selectedIds[0] ?? undefined);
    setDialogOpen(true);
  };

  const isUnlinkedView = currentView === "unlinked";

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-6 select-none">
        {/* Header with Import CSV, Stocktake, Adjust stock buttons */}
        <PageHeader
          title="Inventory"
          description="Master stock control across all warehouses with real-time sales channel push."
          actions={
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Import CSV (disabled, tooltip Coming soon) */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0} className="inline-block">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled
                      className="gap-2 h-[42px] px-3.5 rounded-[10px] bg-surface border-line text-muted opacity-60 cursor-not-allowed"
                    >
                      <Upload className="h-4 w-4" />
                      <span>Import CSV</span>
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">Coming soon</TooltipContent>
              </Tooltip>

              {/* Stocktake Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenStocktake}
                className="gap-2 h-[42px] px-3.5 rounded-[10px] bg-surface border-line text-ink hover:bg-ground cursor-pointer"
              >
                <ClipboardList className="h-4 w-4 text-muted" />
                <span>Stocktake</span>
              </Button>

              {/* Adjust Stock Button */}
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleOpenAdjust()}
                className="gap-2 h-[42px] px-4 rounded-[10px] bg-accent hover:bg-accent-hover text-white font-medium cursor-pointer shadow-xs"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>Adjust stock</span>
              </Button>
            </div>
          }
        />

        {/* Saved-view Tabs */}
        <InventoryTabs counts={tabs} currentView={currentView} />

        {/* Search & Filter Bar */}
        <InventoryFilters warehouses={warehouses} channels={channels} />

        {/* Stock Table / Unlinked Listings Table */}
        <InventoryTable
          items={items}
          unlinkedListings={unlinkedListings}
          isUnlinkedView={isUnlinkedView}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
        />

        {/* Floating Bulk Action Bar (only for standard items) */}
        {!isUnlinkedView && (
          <FloatingBulkActionBar
            selectedCount={selectedIds.length}
            onAdjust={() => handleOpenAdjust()}
            onClear={() => setSelectedIds([])}
          />
        )}

        {/* Adjust Stock Modal Dialog */}
        <AdjustStockDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          products={selectableProducts}
          warehouses={warehouses}
          initialProductId={dialogProductId}
          initialMode={dialogMode}
          onSuccess={() => {
            setSelectedIds([]);
          }}
        />
      </div>
    </TooltipProvider>
  );
}
