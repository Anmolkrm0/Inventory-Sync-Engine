"use client";

import React, { useState } from "react";
import Link from "next/link";
import { StatusPill } from "@/components/shared/StatusPill";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, Layers } from "lucide-react";
import type { StockStatus } from "@/server/stock";
import { AdjustStockDialog } from "@/components/inventory/AdjustStockDialog";
import type {
  SelectableProductOption,
  InventoryWarehouseOption,
} from "@/server/inventory";

export interface SkuHeaderProps {
  product: {
    id: string;
    sku: string;
    name: string;
    barcode: string | null;
    category: string | null;
    swatch: string | null;
    costCents: number;
    usedInBundlesCount: number;
  };
  status: StockStatus;
  warehouses: InventoryWarehouseOption[];
  selectableProducts: SelectableProductOption[];
}

export function SkuHeader({
  product,
  status,
  warehouses,
  selectableProducts,
}: SkuHeaderProps) {
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
      <div className="flex items-start gap-4">
        {/* Big Swatch */}
        <div
          className="h-14 w-14 rounded-[12px] border border-line shadow-xs shrink-0 flex items-center justify-center"
          style={{ backgroundColor: product.swatch ?? "#3155F5" }}
          aria-hidden="true"
        />

        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-ink">
              {product.name}
            </h1>
            <StatusPill status={status} />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Mono SKU chip */}
            <span className="font-mono font-medium text-ink bg-ground border border-line px-2.5 py-1 rounded-[6px]">
              {product.sku}
            </span>

            {/* Barcode */}
            {product.barcode && (
              <span className="font-mono text-muted bg-surface border border-line px-2.5 py-1 rounded-[6px]">
                UPC: {product.barcode}
              </span>
            )}

            {/* Category */}
            {product.category && (
              <span className="font-medium text-muted bg-ground px-2.5 py-1 rounded-[6px]">
                {product.category}
              </span>
            )}

            {/* Used in N bundles */}
            {product.usedInBundlesCount > 0 ? (
              <Link
                href="/bundles"
                className="inline-flex items-center gap-1 font-medium text-accent bg-accent-soft hover:bg-accent hover:text-white px-2.5 py-1 rounded-[6px] transition-colors"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>
                  Used in {product.usedInBundlesCount}{" "}
                  {product.usedInBundlesCount === 1 ? "bundle" : "bundles"}
                </span>
              </Link>
            ) : (
              <span className="text-muted/70 text-[11px] py-1">
                Standalone SKU
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Adjust stock button */}
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="ink"
          onClick={() => setIsAdjustOpen(true)}
          className="gap-2 shadow-xs cursor-pointer"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>Adjust stock</span>
        </Button>
      </div>

      {/* Adjust Stock Dialog */}
      <AdjustStockDialog
        open={isAdjustOpen}
        onOpenChange={setIsAdjustOpen}
        products={selectableProducts}
        warehouses={warehouses}
        initialProductId={product.id}
      />
    </div>
  );
}
