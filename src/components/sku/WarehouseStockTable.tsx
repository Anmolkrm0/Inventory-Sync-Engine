"use client";

import React, { useState, useTransition } from "react";
import { Card } from "@/components/shared/Card";
import { StatusPill } from "@/components/shared/StatusPill";
import { updateCloseAtAction } from "@/app/(app)/inventory/[sku]/actions";
import { useToast } from "@/components/shared/Toast";
import type { SkuWarehouseStock } from "@/server/sku";
import { Check, Loader2, Warehouse as WarehouseIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface CloseAtInputProps {
  productId: string;
  warehouseId: string;
  warehouseName: string;
  initialCloseAt: number;
  sku: string;
}

function CloseAtInput({
  productId,
  warehouseId,
  warehouseName,
  initialCloseAt,
  sku,
}: CloseAtInputProps) {
  const [val, setVal] = useState<string>(initialCloseAt.toString());
  const [savedVal, setSavedVal] = useState<number>(initialCloseAt);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleBlur = () => {
    const parsed = Number(val);
    if (!Number.isInteger(parsed) || parsed < 0) {
      toast("Close-at must be a non-negative integer.", "error");
      setVal(savedVal.toString());
      return;
    }

    if (parsed === savedVal) {
      return;
    }

    startTransition(async () => {
      const res = await updateCloseAtAction({
        productId,
        warehouseId,
        closeAt: parsed,
        sku,
      });

      if (res.ok) {
        setSavedVal(parsed);
        setIsSaved(true);
        toast(`Close-at updated to ${parsed} for ${warehouseName}`, "success");
        setTimeout(() => setIsSaved(false), 2000);
      } else {
        toast(res.message ?? "Failed to update close-at", "error");
        setVal(savedVal.toString());
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  return (
    <div className="flex items-center gap-1.5 justify-end">
      <input
        type="number"
        min={0}
        max={1000000}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={isPending}
        aria-label={`Close-at threshold for ${warehouseName}`}
        className={cn(
          "h-8 w-20 px-2 text-right font-mono text-sm rounded-[8px] border border-line bg-surface tabular-nums text-ink transition-all",
          "focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent",
          isPending && "opacity-60 cursor-wait",
          isSaved && "border-good text-good-text"
        )}
      />
      <div className="w-4 h-4 flex items-center justify-center shrink-0">
        {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />}
        {isSaved && !isPending && <Check className="w-3.5 h-3.5 text-good stroke-[2.5]" />}
      </div>
    </div>
  );
}

export interface WarehouseStockTableProps {
  productId: string;
  sku: string;
  warehouses: SkuWarehouseStock[];
}

export function WarehouseStockTable({
  productId,
  sku,
  warehouses,
}: WarehouseStockTableProps) {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-5 py-4 border-b border-hairline flex items-center justify-between">
        <div className="flex items-center gap-2">
          <WarehouseIcon className="w-4 h-4 text-muted" />
          <h2 className="font-heading text-base font-semibold text-ink">
            Stock by warehouse
          </h2>
        </div>
        <span className="text-xs text-muted">
          Close-at saves automatically on blur
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse min-w-[620px]">
          <thead>
            <tr className="border-b border-hairline bg-ground/50 text-xs font-semibold text-muted uppercase tracking-wider">
              <th className="py-3 px-5">Warehouse</th>
              <th className="py-3 px-4 text-right">In stock</th>
              <th className="py-3 px-4 text-right">Booked</th>
              <th className="py-3 px-4 text-right">Available</th>
              <th className="py-3 px-4 text-right">Incoming</th>
              <th className="py-3 px-5 text-right w-36">Close at</th>
              <th className="py-3 px-5 text-center min-w-[120px]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {warehouses.map((wh) => (
              <tr
                key={wh.warehouseId}
                className={cn(
                  "hover:bg-ground/40 transition-colors",
                  !wh.stocked && "opacity-60 bg-ground/20"
                )}
              >
                <td className="py-3.5 px-5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink">{wh.warehouseName}</span>
                    <span className="text-[11px] font-medium text-muted bg-ground border border-line px-1.5 py-0.5 rounded-[4px]">
                      {wh.warehouseKind}
                    </span>
                    {!wh.stocked && (
                      <span className="text-[11px] text-muted italic">
                        (Not stocked)
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3.5 px-4 text-right font-mono tabular-nums text-ink">
                  {wh.stocked ? wh.onHand : "—"}
                </td>
                <td className="py-3.5 px-4 text-right font-mono tabular-nums text-muted">
                  {wh.stocked ? wh.booked : "—"}
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-bold tabular-nums text-ink">
                  {wh.stocked ? wh.available : "—"}
                </td>
                <td className="py-3.5 px-4 text-right font-mono tabular-nums text-muted">
                  {wh.stocked ? wh.incoming : "—"}
                </td>
                <td className="py-3.5 px-5 text-right">
                  {wh.stocked ? (
                    <CloseAtInput
                      productId={productId}
                      warehouseId={wh.warehouseId}
                      warehouseName={wh.warehouseName}
                      initialCloseAt={wh.closeAt}
                      sku={sku}
                    />
                  ) : (
                    <span className="text-muted text-xs">—</span>
                  )}
                </td>
                <td className="py-3.5 px-5 text-center min-w-[120px]">
                  {wh.stocked ? (
                    <StatusPill status={wh.status} />
                  ) : (
                    <span className="text-xs text-muted font-medium">Inactive</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
