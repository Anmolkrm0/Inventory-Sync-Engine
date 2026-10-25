"use client";

import React, { useState, useTransition, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SelectableProductOption,
  InventoryWarehouseOption,
} from "@/server/inventory";
import { adjustStockAction } from "@/app/(app)/inventory/actions";
import { useToast } from "@/components/shared/Toast";
import { AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MoveReason } from "@prisma/client";

export interface AdjustStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: SelectableProductOption[];
  warehouses: InventoryWarehouseOption[];
  initialProductId?: string;
  initialWarehouseId?: string;
  initialMode?: "adjust" | "set";
  onSuccess?: () => void;
}

export function AdjustStockDialog({
  open,
  onOpenChange,
  products,
  warehouses,
  initialProductId,
  initialWarehouseId,
  initialMode = "adjust",
  onSuccess,
}: AdjustStockDialogProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Eligible products (non-bundles only, since bundles don't hold physical stock)
  const nonBundleProducts = products.filter((p) => !p.isBundle);

  const [productId, setProductId] = useState<string>(
    initialProductId ?? nonBundleProducts[0]?.id ?? ""
  );
  const [warehouseId, setWarehouseId] = useState<string>(
    initialWarehouseId ?? warehouses[0]?.id ?? ""
  );
  const [mode, setMode] = useState<"adjust" | "set">(initialMode);
  const [quantity, setQuantity] = useState<string>("1");
  const [reason, setReason] = useState<MoveReason>("MANUAL");
  const [refLabel, setRefLabel] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync state when opened with initial props
  useEffect(() => {
    if (open) {
      setProductId((prev) => initialProductId ?? (prev || nonBundleProducts[0]?.id || ""));
      setWarehouseId((prev) => initialWarehouseId ?? (prev || warehouses[0]?.id || ""));
      if (initialMode) setMode(initialMode);
      setErrorMsg(null);
    }
  }, [open, initialProductId, initialWarehouseId, initialMode, nonBundleProducts, warehouses]);

  // Find current on-hand for selected product and warehouse
  const selectedProduct = nonBundleProducts.find((p) => p.id === productId);
  const selectedWhStock = selectedProduct?.warehouses.find(
    (w) => w.warehouseId === warehouseId
  );
  const currentOnHand = selectedWhStock?.onHand ?? 0;
  const currentBooked = selectedWhStock?.booked ?? 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const num = Number(quantity);
    if (!Number.isInteger(num)) {
      setErrorMsg("Please enter a valid whole number for quantity.");
      return;
    }

    if (Math.abs(num) > 1_000_000) {
      setErrorMsg("Quantity must be between -1,000,000 and 1,000,000.");
      return;
    }

    const parsedQty = num;

    if (mode === "adjust" && parsedQty === 0) {
      setErrorMsg("Adjustment quantity must be non-zero (positive to add, negative to remove).");
      return;
    }

    if (mode === "set" && parsedQty < 0) {
      setErrorMsg("Target on-hand quantity cannot be negative.");
      return;
    }

    startTransition(async () => {
      const result = await adjustStockAction({
        productId,
        warehouseId,
        mode,
        quantity: parsedQty,
        reason,
        refLabel: refLabel.trim() || undefined,
        note: note.trim() || undefined,
      });

      if (!result.ok) {
        setErrorMsg(result.message ?? "Failed to adjust stock.");
      } else {
        toast(
          mode === "set"
            ? `Stock level set to ${parsedQty} on hand.`
            : `Stock level ${parsedQty > 0 ? `increased by +${parsedQty}` : `decreased by ${parsedQty}`}.`,
          "success"
        );
        onOpenChange(false);
        onSuccess?.();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">Adjust stock</DialogTitle>
          <DialogDescription className="text-xs text-muted">
            Update physical inventory levels across warehouses with full transaction locking.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3 rounded-[8px] bg-bad-soft border border-bad/20 text-xs font-medium text-bad-text">
              <AlertCircle className="h-4 w-4 shrink-0 text-bad mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Mode Segmented Toggle */}
          <div className="flex p-1 rounded-[10px] bg-ground border border-line">
            <button
              type="button"
              onClick={() => {
                setMode("adjust");
                setReason("MANUAL");
                setErrorMsg(null);
              }}
              className={cn(
                "flex-1 py-1.5 text-xs font-semibold rounded-[8px] transition-all cursor-pointer select-none",
                mode === "adjust"
                  ? "bg-surface text-ink shadow-xs"
                  : "text-muted hover:text-ink"
              )}
            >
              Add / Remove quantity
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("set");
                setReason("STOCKTAKE");
                setQuantity(currentOnHand.toString());
                setErrorMsg(null);
              }}
              className={cn(
                "flex-1 py-1.5 text-xs font-semibold rounded-[8px] transition-all cursor-pointer select-none",
                mode === "set"
                  ? "bg-surface text-ink shadow-xs"
                  : "text-muted hover:text-ink"
              )}
            >
              Set exact (Stocktake)
            </button>
          </div>

          {/* Product Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink">Product</label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full h-[42px] px-3 rounded-[10px] border border-line bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
              disabled={isPending}
            >
              {nonBundleProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          {/* Warehouse Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink">Warehouse</label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="w-full h-[42px] px-3 rounded-[10px] border border-line bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
              disabled={isPending}
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.kind})
                </option>
              ))}
            </select>
          </div>

          {/* Current Stock Banner */}
          <div className="flex items-center justify-between p-2.5 rounded-[8px] bg-accent-soft border border-accent/15 text-xs">
            <span className="text-accent-text font-medium">
              Current warehouse stock
            </span>
            <div className="flex items-center gap-3 font-mono font-semibold tabular-nums text-ink">
              <span>On hand: {currentOnHand}</span>
              <span className="text-muted">Booked: {currentBooked}</span>
              <span className="text-accent font-bold">
                Available: {Math.max(0, currentOnHand - currentBooked)}
              </span>
            </div>
          </div>

          {/* Quantity Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-ink">
                {mode === "adjust" ? "Adjustment quantity" : "Target on hand"}
              </label>
              <span className="text-[11px] text-muted">
                {mode === "adjust"
                  ? "Enter +N to add, -N to remove"
                  : "Final on-hand count"}
              </span>
            </div>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={mode === "adjust" ? "e.g. 10 or -5" : "e.g. 50"}
              disabled={isPending}
              className="font-mono tabular-nums"
              required
            />
          </div>

          {/* Reason Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink">Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as MoveReason)}
              className="w-full h-[42px] px-3 rounded-[10px] border border-line bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
              disabled={isPending}
            >
              <option value="MANUAL">Manual adjustment</option>
              <option value="STOCKTAKE">Stocktake / Cycle count</option>
              <option value="PO_RECEIVE">Purchase order received</option>
              <option value="RETURN">Customer return</option>
              <option value="CANCEL">Order cancellation</option>
              <option value="TRANSFER">Warehouse transfer</option>
            </select>
          </div>

          {/* Reference Label (optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink">
              Reference label <span className="text-muted font-normal">(optional)</span>
            </label>
            <Input
              type="text"
              value={refLabel}
              onChange={(e) => setRefLabel(e.target.value)}
              placeholder="e.g. PO #1084 · Supplier restock"
              disabled={isPending}
            />
          </div>

          {/* Note (optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink">
              Note <span className="text-muted font-normal">(optional)</span>
            </label>
            <Input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Internal reasoning or notes..."
              disabled={isPending}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="ink"
              disabled={isPending}
              className="gap-2"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isPending ? "Applying..." : "Save adjustment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
