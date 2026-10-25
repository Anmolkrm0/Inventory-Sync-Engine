import React from "react";
import { getInventoryData } from "@/server/inventory";
import { InventoryClient } from "@/components/inventory/InventoryClient";

interface InventoryPageProps {
  searchParams: Promise<{
    view?: string;
    q?: string;
    warehouseId?: string;
    channelId?: string;
  }>;
}

export default async function InventoryPage({
  searchParams,
}: InventoryPageProps) {
  const resolvedParams = await searchParams;

  const data = await getInventoryData({
    view: resolvedParams.view,
    q: resolvedParams.q,
    warehouseId: resolvedParams.warehouseId,
    channelId: resolvedParams.channelId,
  });

  return (
    <InventoryClient
      items={data.items}
      tabs={data.tabs}
      warehouses={data.warehouses}
      channels={data.channels}
      selectableProducts={data.selectableProducts}
      currentView={resolvedParams.view ?? "all"}
    />
  );
}
