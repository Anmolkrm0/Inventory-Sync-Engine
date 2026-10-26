"use client";

import React from "react";
import Link from "next/link";
import { InventoryItem, UnlinkedListingItem } from "@/server/inventory";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusPill } from "@/components/shared/StatusPill";
import { ChannelTile } from "@/components/shared/ChannelTile";
import { Card } from "@/components/shared/Card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InventoryTableProps {
  items: InventoryItem[];
  unlinkedListings?: UnlinkedListingItem[];
  isUnlinkedView?: boolean;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
}

export function InventoryTable({
  items,
  unlinkedListings = [],
  isUnlinkedView = false,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}: InventoryTableProps) {
  // If in Unlinked listings view, render unlinked channel listings
  if (isUnlinkedView) {
    if (unlinkedListings.length === 0) {
      return (
        <Card className="p-12 text-center">
          <h3 className="text-base font-semibold text-ink font-heading">
            No unlinked listings
          </h3>
          <p className="mt-1 text-xs text-muted">
            All connected sales channel listings are successfully linked to master SKUs.
          </p>
        </Card>
      );
    }

    return (
      <TooltipProvider delayDuration={150}>
        <Card className="p-0 overflow-hidden border-line">
          <div className="overflow-x-auto">
            <Table className="w-full min-w-[750px]">
              <TableHeader className="bg-ground/60 border-b border-line">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-40 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider pl-5">
                    Channel
                  </TableHead>
                  <TableHead className="min-w-[280px] py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">
                    Listing Title
                  </TableHead>
                  <TableHead className="w-40 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">
                    External ID
                  </TableHead>
                  <TableHead className="w-28 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider text-right">
                    Channel Qty
                  </TableHead>
                  <TableHead className="w-36 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="w-28 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider text-right pr-5">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-hairline">
                {unlinkedListings.map((listing) => (
                  <TableRow key={listing.id} className="hover:bg-ground/40">
                    <TableCell className="py-3 pl-5">
                      <div className="flex items-center gap-2">
                        <ChannelTile
                          type={listing.channel.type}
                          name={listing.channel.name}
                          size="xs"
                        />
                        <span className="text-xs font-medium text-ink">
                          {listing.channel.name}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="py-3">
                      <span className="text-sm font-semibold text-ink">
                        {listing.title}
                      </span>
                    </TableCell>

                    <TableCell className="py-3">
                      <span className="font-mono text-xs text-muted bg-ground px-1.5 py-0.5 rounded-[4px] border border-line tracking-tight">
                        {listing.externalId}
                      </span>
                    </TableCell>

                    <TableCell className="py-3 text-right font-mono text-sm tabular-nums text-ink font-medium">
                      {listing.channelQty ?? "—"}
                    </TableCell>

                    <TableCell className="py-3">
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-warn-soft text-warn-text">
                        Needs match
                      </span>
                    </TableCell>

                    <TableCell className="py-3 text-right pr-5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span tabIndex={0} className="inline-block">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled
                              className="h-8 px-2.5 rounded-[8px] text-xs gap-1 text-muted opacity-60 cursor-not-allowed"
                            >
                              <Link2 className="h-3.5 w-3.5" />
                              <span>Link SKU</span>
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="left">Coming soon</TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </TooltipProvider>
    );
  }

  // Standard Product Stock Table
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

              {/* Close at (shows value or 'Varies') */}
              <TableHead className="w-24 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider text-right">
                Close at
              </TableHead>

              {/* Status */}
              <TableHead className="w-32 min-w-[120px] py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">
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
                      <span className="text-xs text-muted">No listings</span>
                    )}
                  </TableCell>

                  {/* In Stock */}
                  <TableCell className="py-3 text-right font-mono text-sm tabular-nums text-ink font-medium">
                    {item.isBundle ? "—" : item.onHand}
                  </TableCell>

                  {/* Booked */}
                  <TableCell className="py-3 text-right font-mono text-sm tabular-nums text-muted">
                    {item.isBundle ? "—" : item.booked}
                  </TableCell>

                  {/* Available (Bold) */}
                  <TableCell className="py-3 text-right font-mono text-sm tabular-nums font-bold text-ink">
                    {item.available}
                  </TableCell>

                  {/* Incoming */}
                  <TableCell className="py-3 text-right font-mono text-sm tabular-nums text-muted">
                    {item.isBundle ? "—" : item.incoming > 0 ? `+${item.incoming}` : "0"}
                  </TableCell>

                  {/* Close at (shows value or 'Varies') */}
                  <TableCell className="py-3 text-right font-mono text-sm tabular-nums text-muted">
                    {item.isBundle ? "—" : item.closeAtDisplay}
                  </TableCell>

                  {/* Status Pill */}
                  <TableCell className="py-3 min-w-[120px]">
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
