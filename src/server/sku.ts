import { prisma } from "@/server/db";
import { notFound, redirect } from "next/navigation";
import {
  available as computeAvailable,
  statusFor,
  statusForLevels,
  type StockStatus,
} from "@/server/stock";
import { MoveReason, type ChannelType } from "@prisma/client";
import { availableHistory } from "@/server/history";

export interface SkuWarehouseStock {
  warehouseId: string;
  warehouseName: string;
  warehouseKind: string;
  onHand: number;
  booked: number;
  available: number;
  incoming: number;
  closeAt: number;
  minLevel: number;
  stocked: boolean;
  status: StockStatus;
}

export interface SkuListingItem {
  id: string;
  externalId: string;
  title: string;
  isPrimary: boolean;
  lastPushedQty: number | null;
  channelQty: number | null;
  lastPushedAt: Date | null;
  changedOutsideApp: boolean;
  channel: {
    id: string;
    name: string;
    type: ChannelType;
  };
}

export interface SkuActivityItem {
  id: string;
  delta: number;
  reason: MoveReason;
  refLabel: string | null;
  note: string | null;
  createdAt: Date;
  warehouseName: string;
}

import type {
  InventoryWarehouseOption,
  SelectableProductOption,
} from "@/server/inventory";

export interface SkuDailyTrendPoint {
  date: string;
  dayLabel: string;
  available: number;
}

export interface SkuDetailData {
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
  stats: {
    inStock: number;
    booked: number;
    available: number;
    incoming: number;
    daysOfStockLeft: number | null;
    status: StockStatus;
  };
  warehouses: SkuWarehouseStock[];
  listings: SkuListingItem[];
  trend: SkuDailyTrendPoint[];
  activities: SkuActivityItem[];
  warehouseOptions: InventoryWarehouseOption[];
  selectableProducts: SelectableProductOption[];
}

export async function getSkuDetail(
  accountId: string,
  sku: string
): Promise<SkuDetailData> {
  // 1. Fetch product with warehouse stockLevels, listings, and bundle component relations
  const product = await prisma.product.findUnique({
    where: {
      accountId_sku: {
        accountId,
        sku,
      },
    },
    include: {
      stockLevels: {
        include: { warehouse: true },
        orderBy: { warehouse: { sortOrder: "asc" } },
      },
      listings: {
        include: { channel: true },
      },
      usedInBundles: true,
    },
  });

  if (!product) {
    notFound();
  }

  // If the SKU is a bundle, redirect to /bundles?selected=<sku>
  if (product.isBundle) {
    redirect(`/bundles?selected=${encodeURIComponent(sku)}`);
  }

  // 2. Compute stock levels per warehouse
  const warehousesStock: SkuWarehouseStock[] = product.stockLevels.map((lvl) => ({
    warehouseId: lvl.warehouseId,
    warehouseName: lvl.warehouse.name,
    warehouseKind: lvl.warehouse.kind,
    onHand: lvl.onHand,
    booked: lvl.booked,
    available: computeAvailable(lvl),
    incoming: lvl.incoming,
    closeAt: lvl.closeAt,
    minLevel: lvl.minLevel,
    stocked: lvl.stocked,
    status: statusFor(lvl),
  }));

  // 3. Compute aggregate stats over stocked warehouses only
  const stockedLevels = product.stockLevels.filter((lvl) => lvl.stocked);
  const totalOnHand = stockedLevels.reduce((acc, lvl) => acc + lvl.onHand, 0);
  const totalBooked = stockedLevels.reduce((acc, lvl) => acc + lvl.booked, 0);
  const totalAvailable = stockedLevels.reduce(
    (acc, lvl) => acc + computeAvailable(lvl),
    0
  );
  const totalIncoming = stockedLevels.reduce((acc, lvl) => acc + lvl.incoming, 0);
  const aggregateStatus = statusForLevels(stockedLevels);

  // 4. Compute days of stock left from ORDER movements over the last 30 days in stocked warehouses
  const stockedWarehouseIds = stockedLevels.map((lvl) => lvl.warehouseId);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const orderMovements = await prisma.stockMovement.findMany({
    where: {
      productId: product.id,
      warehouseId: { in: stockedWarehouseIds },
      reason: MoveReason.ORDER,
      createdAt: { gte: thirtyDaysAgo },
    },
    select: { delta: true },
  });

  const totalSoldUnits = orderMovements.reduce(
    (acc, m) => acc + Math.abs(m.delta),
    0
  );
  const avgDailyOrders = totalSoldUnits / 30;
  const daysOfStockLeft =
    avgDailyOrders > 0
      ? Math.round(totalAvailable / avgDailyOrders)
      : null;

  // 5. Build 30-day Available Trend points using shared availableHistory
  const history = await availableHistory(accountId, {
    productIds: [product.id],
    days: 30,
  });
  const trendPoints = history.points;

  // 6. Linked Listings: primary first; flag changedOutsideApp if channelQty !== lastPushedQty
  const sortedListings: SkuListingItem[] = product.listings
    .map((l) => ({
      id: l.id,
      externalId: l.externalId,
      title: l.title,
      isPrimary: l.isPrimary,
      lastPushedQty: l.lastPushedQty,
      channelQty: l.channelQty,
      lastPushedAt: l.lastPushedAt,
      changedOutsideApp:
        l.channelQty !== null &&
        l.lastPushedQty !== null &&
        l.channelQty !== l.lastPushedQty,
      channel: {
        id: l.channel.id,
        name: l.channel.name,
        type: l.channel.type,
      },
    }))
    .sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return a.channel.name.localeCompare(b.channel.name);
    });

  // 7. Activity Log: latest 20 movements, newest first
  const latest20Movements = await prisma.stockMovement.findMany({
    where: {
      productId: product.id,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const warehouseMap = new Map(
    product.stockLevels.map((sl) => [sl.warehouseId, sl.warehouse.name])
  );

  const activities: SkuActivityItem[] = latest20Movements.map((m) => ({
    id: m.id,
    delta: m.delta,
    reason: m.reason,
    refLabel: m.refLabel,
    note: m.note,
    createdAt: m.createdAt,
    warehouseName: warehouseMap.get(m.warehouseId) ?? "Warehouse",
  }));

  const [warehouses, allProducts] = await Promise.all([
    prisma.warehouse.findMany({
      where: { accountId },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, kind: true },
    }),
    prisma.product.findMany({
      where: { accountId, isBundle: false },
      select: {
        id: true,
        sku: true,
        name: true,
        isBundle: true,
        stockLevels: true,
      },
      orderBy: { sku: "asc" },
    }),
  ]);

  const warehouseOptions: InventoryWarehouseOption[] = warehouses.map((w) => ({
    id: w.id,
    name: w.name,
    kind: w.kind,
  }));

  const selectableProducts: SelectableProductOption[] = allProducts.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    isBundle: p.isBundle,
    warehouses: warehouses.map((wh) => {
      const lvl = p.stockLevels.find((sl) => sl.warehouseId === wh.id);
      return {
        warehouseId: wh.id,
        warehouseName: wh.name,
        onHand: lvl?.onHand ?? 0,
        booked: lvl?.booked ?? 0,
      };
    }),
  }));

  return {
    product: {
      id: product.id,
      sku: product.sku,
      name: product.name,
      barcode: product.barcode,
      category: product.category,
      swatch: product.swatch,
      costCents: product.costCents,
      usedInBundlesCount: product.usedInBundles.length,
    },
    stats: {
      inStock: totalOnHand,
      booked: totalBooked,
      available: totalAvailable,
      incoming: totalIncoming,
      daysOfStockLeft,
      status: aggregateStatus,
    },
    warehouses: warehousesStock,
    listings: sortedListings,
    trend: trendPoints,
    activities,
    warehouseOptions,
    selectableProducts,
  };
}
