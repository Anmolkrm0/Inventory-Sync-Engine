"use client";

import React from "react";
import Link from "next/link";
import { InventoryItem } from "@/server/inventory";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusPill } from "@/components/shared/StatusPill";
import { ChannelTile } from "@/components/shared/ChannelTile";
import { Card } from "@/components/shared/Card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface InventoryTableProps {
  items: InventoryItem[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
}

export function InventoryTable({
  items,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}: InventoryTableProps) {
  const isAllSelected =
    items.length > 0 && items.every((item) => selectedIds.includes(item.id));
  const isSomeSelected =
    items.some((item) => selectedIds.includes(item.id)) && !isAllSelected;

  if (items.length === 0) {
    return (
      <Card className="p-12 text-center">
        <h3 className="text-base font-semibold text-ink font-heading">
          No products found
        </h3>
        <p className="mt-1 text-xs text-muted">
          Try clearing your search query or adjusting your warehouse and channel filters.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-0 overflow-hidden border-line">
      <div className="overflow-x-auto">
        <Table className="w-full min-w-[900px]">
          <TableHeader className="bg-ground/60 border-b border-line">
            <TableRow className="hover:bg-transparent">
              {/* Select All Checkbox */}
              <TableHead className="w-12 px-4 py-3.5">
                <Checkbox
                  checked={isAllSelected ? true : isSomeSelected ? "indeterminate" : false}
                  onCheckedChange={onToggleSelectAll}
                  aria-label="Select all products"
                />
              </TableHead>

              {/* Product Info */}
              <TableHead className="min-w-[260px] py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">
                Product
              </TableHead>

              {/* Channels */}
              <TableHead className="w-32 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">
                Channels
              </TableHead>

              {/* In Stock */}
              <TableHead className="w-24 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider text-right">
                In stock
              </TableHead>

              {/* Booked */}
              <TableHead className="w-20 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider text-right">
                Booked
              </TableHead>

              {/* Available (Bold) */}
              <TableHead className="w-24 py-3.5 text-xs font-bold text-ink uppercase tracking-wider text-right">
                Available
              </TableHead>

              {/* Incoming */}
              <TableHead className="w-20 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider text-right">
                Incoming
              </TableHead>

              {/* Close at */}
              <TableHead className="w-20 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider text-right">
                Close at
              </TableHead>

              {/* Status */}
              <TableHead className="w-28 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">
                Status
              </TableHead>

              {/* Last Push */}
              <TableHead className="w-24 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider text-right pr-5">
                Last push
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-hairline">
            {items.map((item) => {
              const isSelected = selectedIds.includes(item.id);

              return (
                <TableRow
                  key={item.id}
                  className={cn(
                    "group transition-colors",
                    isSelected
                      ? "bg-accent/5 hover:bg-accent/8"
                      : "hover:bg-ground/40"
                  )}
                >
                  {/* Row Checkbox */}
                  <TableCell className="w-12 px-4 py-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleSelect(item.id)}
                      aria-label={`Select ${item.name}`}
                    />
                  </TableCell>

                  {/* Product Details (links to /inventory/[sku]) */}
                  <TableCell className="py-3">
                    <Link
                      href={`/inventory/${encodeURIComponent(item.sku)}`}
                      className="flex items-center gap-3 group-hover:opacity-95 select-none"
                    >
                      {/* Product Swatch */}
                      <div
                        className="h-8 w-8 rounded-[6px] shrink-0 border border-line shadow-2xs"
                        style={{
                          backgroundColor: item.swatch || "#3155F5",
                        }}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold text-ink group-hover:text-accent transition-colors truncate">
                          {item.name}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[11px] font-medium text-muted bg-ground px-1.5 py-0.2 rounded-[4px] border border-line tracking-tight">
                            {item.sku}
                          </span>
                          {item.isBundle && (
                            <span className="text-[10px] font-semibold text-accent bg-accent-soft px-1.5 py-0.2 rounded-[4px]">
                              Bundle
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </TableCell>

                  {/* Connected Channel Tiles */}
                  <TableCell className="py-3">
                    {item.channels.length > 0 ? (
                      <div className="flex items-center gap-1 flex-wrap">
                        {item.channels.map((ch) => (
                          <ChannelTile
                            key={ch.id}
                            type={ch.type}
                            name={ch.name}
                            size="xs"
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted italic">Unlinked</span>
                    )}
                  </TableCell>

                  {/* In Stock */}
                  <TableCell className="py-3 text-right font-mono text-sm tabular-nums text-ink font-medium">
                    {item.onHand}
                  </TableCell>

                  {/* Booked */}
                  <TableCell className="py-3 text-right font-mono text-sm tabular-nums text-muted">
                    {item.booked}
                  </TableCell>

                  {/* Available (Bold) */}
                  <TableCell className="py-3 text-right font-mono text-sm tabular-nums font-bold text-ink">
                    {item.available}
                  </TableCell>

                  {/* Incoming */}
                  <TableCell className="py-3 text-right font-mono text-sm tabular-nums text-muted">
                    {item.incoming > 0 ? `+${item.incoming}` : "0"}
                  </TableCell>

                  {/* Close at */}
                  <TableCell className="py-3 text-right font-mono text-sm tabular-nums text-muted">
                    {item.closeAt}
                  </TableCell>

                  {/* Status Pill */}
                  <TableCell className="py-3">
                    <StatusPill status={item.status} />
                  </TableCell>

                  {/* Last Push */}
                  <TableCell className="py-3 text-right font-mono text-xs tabular-nums text-muted whitespace-nowrap pr-5">
                    {item.lastPush}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
