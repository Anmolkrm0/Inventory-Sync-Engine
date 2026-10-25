import { prisma } from "@/server/db";
import { getCurrentAccountId } from "@/server/account";
import {
  available as computeAvailable,
  statusFor,
  type StockStatus,
} from "@/server/stock";
import { bundleAvailable } from "@/server/bundles";
import type { ChannelType } from "@prisma/client";

export interface InventoryItemChannel {
  id: string;
  name: string;
  type: ChannelType;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  barcode: string | null;
  category: string | null;
  swatch: string | null;
  isBundle: boolean;
  channels: InventoryItemChannel[];
  onHand: number;
  booked: number;
  available: number;
  incoming: number;
  closeAt: number;
  status: StockStatus;
  lastPush: string;
  lastPushedAt: Date | null;
}

export interface InventoryTabCounts {
  all: number;
  low_stock: number;
  sold_out: number;
  held: number;
  unlinked: number;
}

export interface InventoryWarehouseOption {
  id: string;
  name: string;
  kind: string;
}

export interface InventoryChannelOption {
  id: string;
  name: string;
  type: ChannelType;
}

export interface SelectableProductOption {
  id: string;
  sku: string;
  name: string;
  isBundle: boolean;
  warehouses: {
    warehouseId: string;
    warehouseName: string;
    onHand: number;
    booked: number;
  }[];
}

export interface InventoryDataResult {
  items: InventoryItem[];
  tabs: InventoryTabCounts;
  warehouses: InventoryWarehouseOption[];
  channels: InventoryChannelOption[];
  selectableProducts: SelectableProductOption[];
}

export function formatRelativeTime(date: Date | null | undefined): string {
  if (!date) return "—";
  const now = Date.now();
  const diffSec = Math.floor((now - new Date(date).getTime()) / 1000);

  if (diffSec < 60) return `${Math.max(1, diffSec)}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export interface GetInventoryParams {
  view?: string;
  q?: string;
  warehouseId?: string;
  channelId?: string;
}

export async function getInventoryData(
  params: GetInventoryParams = {}
): Promise<InventoryDataResult> {
  const accountId = await getCurrentAccountId();

  // 1. Fetch all warehouses and channels for this account
  const [warehouses, channels, allProducts] = await Promise.all([
    prisma.warehouse.findMany({
      where: { accountId },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, kind: true },
    }),
    prisma.channel.findMany({
      where: { accountId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true },
    }),
    prisma.product.findMany({
      where: { accountId },
      include: {
        stockLevels: {
          include: { warehouse: true },
        },
        listings: {
          include: { channel: true },
        },
      },
      orderBy: { sku: "asc" },
    }),
  ]);

  // 2. Pre-calculate bundle availability for any bundle products
  const bundleAvailMap = new Map<string, number>();
  for (const product of allProducts) {
    if (product.isBundle) {
      const res = await bundleAvailable(accountId, product.id);
      bundleAvailMap.set(product.id, res.available);
    }
  }

  // 3. Transform all products into InventoryItem objects
  const computedItems: InventoryItem[] = allProducts.map((product) => {
    // Collect unique channels from listings
    const uniqueChannelsMap = new Map<string, InventoryItemChannel>();
    for (const listing of product.listings) {
      if (!uniqueChannelsMap.has(listing.channel.id)) {
        uniqueChannelsMap.set(listing.channel.id, {
          id: listing.channel.id,
          name: listing.channel.name,
          type: listing.channel.type,
        });
      }
    }
    const productChannels = Array.from(uniqueChannelsMap.values());

    // Most recent lastPushedAt across all listings
    let latestPushDate: Date | null = null;
    for (const listing of product.listings) {
      if (listing.lastPushedAt) {
        if (!latestPushDate || listing.lastPushedAt > latestPushDate) {
          latestPushDate = listing.lastPushedAt;
        }
      }
    }

    let onHand = 0;
    let booked = 0;
    let available = 0;
    let incoming = 0;
    let closeAt = 0;
    let status: StockStatus = "Healthy";

    if (product.isBundle) {
      available = bundleAvailMap.get(product.id) ?? 0;
      onHand = 0;
      booked = 0;
      incoming = 0;
      closeAt = 0;
      if (available <= 0) {
        status = "Sold out";
      } else if (available <= 5) {
        status = "Low stock";
      } else {
        status = "Healthy";
      }
    } else {
      if (params.warehouseId) {
        const lvl = product.stockLevels.find(
          (sl) => sl.warehouseId === params.warehouseId
        );
        if (lvl) {
          onHand = lvl.onHand;
          booked = lvl.booked;
          available = computeAvailable(lvl);
          incoming = lvl.incoming;
          closeAt = lvl.closeAt;
          status = statusFor(lvl);
        } else {
          onHand = 0;
          booked = 0;
          available = 0;
          incoming = 0;
          closeAt = 0;
          status = "Sold out";
        }
      } else {
        const stockedLevels = product.stockLevels.filter((sl) => sl.stocked);
        onHand = stockedLevels.reduce((acc, sl) => acc + sl.onHand, 0);
        booked = stockedLevels.reduce((acc, sl) => acc + sl.booked, 0);
        available = stockedLevels.reduce(
          (acc, sl) => acc + computeAvailable(sl),
          0
        );
        incoming = stockedLevels.reduce((acc, sl) => acc + sl.incoming, 0);
        closeAt = stockedLevels.reduce((acc, sl) => acc + sl.closeAt, 0);
        const minLevelTotal = stockedLevels.reduce(
          (acc, sl) => acc + sl.minLevel,
          0
        );

        status = statusFor({
          onHand,
          booked,
          closeAt,
          minLevel: minLevelTotal,
        });
      }
    }

    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      barcode: product.barcode,
      category: product.category,
      swatch: product.swatch,
      isBundle: product.isBundle,
      channels: productChannels,
      onHand,
      booked,
      available,
      incoming,
      closeAt,
      status,
      lastPush: formatRelativeTime(latestPushDate),
      lastPushedAt: latestPushDate,
    };
  });

  // 4. Compute Tab Counts based on all items (independent of active tab filter)
  const tabs: InventoryTabCounts = {
    all: computedItems.length,
    low_stock: computedItems.filter((item) => item.status === "Low stock").length,
    sold_out: computedItems.filter((item) => item.status === "Sold out").length,
    held: computedItems.filter((item) => item.status === "Held at 0").length,
    unlinked: computedItems.filter((item) => item.channels.length === 0).length,
  };

  // 5. Apply Active Tab Filter
  let filteredItems = computedItems;
  const currentView = params.view ?? "all";
  if (currentView === "low_stock") {
    filteredItems = filteredItems.filter((item) => item.status === "Low stock");
  } else if (currentView === "sold_out") {
    filteredItems = filteredItems.filter((item) => item.status === "Sold out");
  } else if (currentView === "held") {
    filteredItems = filteredItems.filter((item) => item.status === "Held at 0");
  } else if (currentView === "unlinked") {
    filteredItems = filteredItems.filter((item) => item.channels.length === 0);
  }

  // 6. Apply Search Query Filter (name, sku, barcode)
  if (params.q && params.q.trim()) {
    const query = params.q.trim().toLowerCase();
    filteredItems = filteredItems.filter((item) => {
      const matchSku = item.sku.toLowerCase().includes(query);
      const matchName = item.name.toLowerCase().includes(query);
      const matchBarcode = item.barcode
        ? item.barcode.toLowerCase().includes(query)
        : false;
      return matchSku || matchName || matchBarcode;
    });
  }

  // 7. Apply Channel Filter
  if (params.channelId) {
    filteredItems = filteredItems.filter((item) =>
      item.channels.some((c) => c.id === params.channelId)
    );
  }

  // 8. Prepare Selectable Products for the AdjustStockDialog
  const selectableProducts: SelectableProductOption[] = allProducts.map(
    (product) => ({
      id: product.id,
      sku: product.sku,
      name: product.name,
      isBundle: product.isBundle,
      warehouses: warehouses.map((wh) => {
        const lvl = product.stockLevels.find((sl) => sl.warehouseId === wh.id);
        return {
          warehouseId: wh.id,
          warehouseName: wh.name,
          onHand: lvl?.onHand ?? 0,
          booked: lvl?.booked ?? 0,
        };
      }),
    })
  );

  return {
    items: filteredItems,
    tabs,
    warehouses,
    channels,
    selectableProducts,
  };
}
