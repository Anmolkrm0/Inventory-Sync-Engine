"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  InventoryWarehouseOption,
  InventoryChannelOption,
} from "@/server/inventory";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ChannelTile } from "@/components/shared/ChannelTile";
import {
  Search,
  Warehouse as WarehouseIcon,
  Radio,
  X,
  Check,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface InventoryFiltersProps {
  warehouses: InventoryWarehouseOption[];
  channels: InventoryChannelOption[];
}

export function InventoryFilters({
  warehouses,
  channels,
}: InventoryFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentQ = searchParams.get("q") ?? "";
  const currentWarehouseId = searchParams.get("warehouseId") ?? "";
  const currentChannelId = searchParams.get("channelId") ?? "";

  const [searchTerm, setSearchTerm] = useState(currentQ);

  // Sync internal search input with URL params
  useEffect(() => {
    setSearchTerm(currentQ);
  }, [currentQ]);

  // Handle Search Input submit / debounce
  const updateSearchParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value.trim()) {
      params.set(key, value.trim());
    } else {
      params.delete(key);
    }
    router.replace(`/inventory?${params.toString()}`);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      updateSearchParam("q", searchTerm);
    }
  };

  const handleSearchBlur = () => {
    if (searchTerm !== currentQ) {
      updateSearchParam("q", searchTerm);
    }
  };

  const selectedWarehouse = warehouses.find(
    (w) => w.id === currentWarehouseId
  );
  const selectedChannel = channels.find((c) => c.id === currentChannelId);

  const hasActiveFilters = Boolean(
    currentQ || currentWarehouseId || currentChannelId
  );

  const handleClearAll = () => {
    const params = new URLSearchParams();
    const currentView = searchParams.get("view");
    if (currentView) params.set("view", currentView);
    setSearchTerm("");
    router.replace(`/inventory?${params.toString()}`);
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 select-none">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[240px] max-w-md">
        <Search
          className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none"
          strokeWidth={1.8}
        />
        <Input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          onBlur={handleSearchBlur}
          placeholder="Search by SKU, product name, barcode..."
          className="pl-9 pr-8 h-[42px] bg-surface text-sm border-line"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              updateSearchParam("q", null);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink cursor-pointer"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Filter Dropdown Buttons */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
        {/* Warehouse Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "h-[42px] px-3.5 gap-2 text-xs font-semibold rounded-[10px] bg-surface border-line",
                currentWarehouseId && "border-accent text-accent bg-accent-soft"
              )}
            >
              <WarehouseIcon className="h-4 w-4 shrink-0 text-muted" />
              <span className="truncate max-w-[130px]">
                {selectedWarehouse
                  ? selectedWarehouse.name
                  : "All Warehouses"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem
              onClick={() => updateSearchParam("warehouseId", null)}
              className="flex items-center justify-between text-xs font-medium cursor-pointer"
            >
              <span>All Warehouses</span>
              {!currentWarehouseId && <Check className="h-3.5 w-3.5 text-accent" />}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {warehouses.map((wh) => (
              <DropdownMenuItem
                key={wh.id}
                onClick={() => updateSearchParam("warehouseId", wh.id)}
                className="flex items-center justify-between text-xs font-medium cursor-pointer"
              >
                <span>
                  {wh.name} ({wh.kind})
                </span>
                {currentWarehouseId === wh.id && (
                  <Check className="h-3.5 w-3.5 text-accent" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Channel Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "h-[42px] px-3.5 gap-2 text-xs font-semibold rounded-[10px] bg-surface border-line",
                currentChannelId && "border-accent text-accent bg-accent-soft"
              )}
            >
              <Radio className="h-4 w-4 shrink-0 text-muted" />
              <span className="truncate max-w-[120px]">
                {selectedChannel ? selectedChannel.name : "All Channels"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem
              onClick={() => updateSearchParam("channelId", null)}
              className="flex items-center justify-between text-xs font-medium cursor-pointer"
            >
              <span>All Channels</span>
              {!currentChannelId && <Check className="h-3.5 w-3.5 text-accent" />}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {channels.map((ch) => (
              <DropdownMenuItem
                key={ch.id}
                onClick={() => updateSearchParam("channelId", ch.id)}
                className="flex items-center justify-between text-xs font-medium cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <ChannelTile type={ch.type} size="xs" />
                  <span>{ch.name}</span>
                </div>
                {currentChannelId === ch.id && (
                  <Check className="h-3.5 w-3.5 text-accent" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            onClick={handleClearAll}
            className="h-[42px] px-2.5 text-xs text-muted hover:text-ink cursor-pointer"
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
