import { prisma } from "@/server/db";
import { MoveReason, type ChannelStatus, type ChannelType } from "@prisma/client";
import { getLocalMidnight, APP_TIMEZONE } from "@/server/timezone";
import { availableHistory } from "@/server/history";
import {
  available as computeAvailable,
  statusForLevels,
  type StockStatus,
} from "@/server/stock";
import { formatRelativeTime } from "@/lib/utils";

export type DashboardRange = "24h" | "7d" | "30d";

export interface DashboardKpiItem {
  label: string;
  value: string | number;
  delta?: {
    value: string;
    type: "good" | "warn" | "bad" | "accent";
  };
  sparkline: number[];
  note: string;
}

export interface DashboardOrderBar {
  label: string;
  fullLabel: string;
  units: number;
  isCurrent: boolean;
}

export interface DashboardOrdersChart {
  range: DashboardRange;
  bars: DashboardOrderBar[];
  totalUnits: number;
  avgUnits: number;
  maxUnits: number;
}

export interface DashboardChannelItem {
  id: string;
  name: string;
  type: ChannelType;
  status: ChannelStatus;
  storeRef: string;
  listingCount: number;
  lastSyncedAt: Date | null;
}

export interface DashboardRunningLowItem {
  id: string;
  sku: string;
  name: string;
  swatch: string | null;
  available: number;
  daysOfStockLeft: number;
  status: StockStatus;
}

export interface DashboardLiveFeedItem {
  id: string;
  delta: number;
  reason: MoveReason;
  refLabel: string | null;
  productName: string;
  sku: string;
  warehouseName: string;
  timeAgo: string;
  createdAt: Date;
}

import type {
  InventoryWarehouseOption,
  SelectableProductOption,
} from "@/server/inventory";

export interface DashboardData {
  lastPushPill: string;
  kpis: {
    availableUnits: DashboardKpiItem;
    ordersToday: DashboardKpiItem;
    lowStockSkus: DashboardKpiItem;
    heldByCloseAt: DashboardKpiItem;
  };
  ordersChart: DashboardOrdersChart;
  channels: DashboardChannelItem[];
  runningLow: DashboardRunningLowItem[];
  liveFeed: DashboardLiveFeedItem[];
  selectableProducts: SelectableProductOption[];
  warehouses: InventoryWarehouseOption[];
}

export async function getDashboardData(
  accountId: string,
  range: DashboardRange = "24h"
): Promise<DashboardData> {
  const now = new Date();
  const todayMidnight = getLocalMidnight(now);

  // 1. Header Pill: Newest lastPushedAt across all listings for account
  const newestPushedListing = await prisma.listing.findFirst({
    where: {
      channel: { accountId },
      lastPushedAt: { not: null },
    },
    orderBy: { lastPushedAt: "desc" },
    select: { lastPushedAt: true },
  });

  const lastPushPill = newestPushedListing?.lastPushedAt
    ? `Live · last push ${formatRelativeTime(newestPushedListing.lastPushedAt)}`
    : "No pushes yet";

  // 2. Fetch all non-bundle products with stocked levels, and warehouses
  const [products, warehouses, channelsRaw] = await Promise.all([
    prisma.product.findMany({
      where: { accountId, isBundle: false },
      include: {
        stockLevels: {
          where: { stocked: true },
        },
      },
      orderBy: { sku: "asc" },
    }),
    prisma.warehouse.findMany({
      where: { accountId },
      select: { id: true, name: true, kind: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.channel.findMany({
      where: { accountId },
      include: {
        _count: {
          select: { listings: true },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const warehouseMap = new Map(warehouses.map((w) => [w.id, w.name]));
  const stockedWarehousePairs = new Set<string>();

  // 3. Compute KPI 1 (Available units) & Product statuses
  let totalAvailableUnits = 0;
  let lowStockCount = 0;
  let heldByCloseAtCount = 0;

  interface ProductComputedStatus {
    product: (typeof products)[0];
    available: number;
    status: StockStatus;
  }

  const computedProductStatuses: ProductComputedStatus[] = [];

  for (const p of products) {
    let pAvail = 0;
    for (const sl of p.stockLevels) {
      pAvail += computeAvailable(sl);
      stockedWarehousePairs.add(`${sl.productId}:${sl.warehouseId}`);
    }
    totalAvailableUnits += pAvail;

    const status = statusForLevels(p.stockLevels);
    computedProductStatuses.push({ product: p, available: pAvail, status });

    if (status === "Low stock" || status === "Sold out") {
      lowStockCount++;
    } else if (status === "Held at 0") {
      heldByCloseAtCount++;
    }
  }

  // 14-day history for available units sparkline & 7-day delta
  const history14 = await availableHistory(accountId, { days: 14 });
  const sparkline14 = history14.values;
  const currentAvail = sparkline14[sparkline14.length - 1] ?? totalAvailableUnits;
  const avail7DaysAgo = sparkline14[sparkline14.length - 8] ?? currentAvail;

  let availableDelta: DashboardKpiItem["delta"] | undefined = undefined;
  if (avail7DaysAgo > 0) {
    const pctChange = Math.round(
      ((currentAvail - avail7DaysAgo) / avail7DaysAgo) * 100
    );
    availableDelta = {
      value: `${pctChange >= 0 ? "+" : ""}${pctChange}% vs 7d`,
      type: pctChange >= 0 ? "good" : "bad",
    };
  }

  // 4. KPI 2: Orders today (count DISTINCT refLabel of ORDER movements since local midnight)
  const orderMovementsToday = await prisma.stockMovement.findMany({
    where: {
      product: { accountId },
      reason: MoveReason.ORDER,
      createdAt: { gte: todayMidnight },
    },
    select: { id: true, refLabel: true },
  });

  const distinctOrdersToday = new Set(
    orderMovementsToday.map((m) => m.refLabel?.trim() || m.id)
  ).size;

  // 14-day daily orders sparkline (count distinct refLabels per day over the last 14 days)
  const fourteenDaysAgoMidnight = new Date(
    todayMidnight.getTime() - 13 * 24 * 60 * 60 * 1000
  );
  const orderMovements14Days = await prisma.stockMovement.findMany({
    where: {
      product: { accountId },
      reason: MoveReason.ORDER,
      createdAt: { gte: fourteenDaysAgoMidnight },
    },
    select: { id: true, refLabel: true, createdAt: true },
  });

  const ordersDailyBuckets = Array.from({ length: 14 }, () => new Set<string>());
  for (const m of orderMovements14Days) {
    const mMidnight = getLocalMidnight(m.createdAt);
    const diffDays = Math.round(
      (todayMidnight.getTime() - mMidnight.getTime()) / (24 * 60 * 60 * 1000)
    );
    const dayIdx = 13 - diffDays;
    if (dayIdx >= 0 && dayIdx < 14) {
      ordersDailyBuckets[dayIdx].add(m.refLabel?.trim() || m.id);
    }
  }
  const ordersSparkline14 = ordersDailyBuckets.map((set) => set.size);

  // 5. KPI 3: Days of stock left calculation for all products & Running low list
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const orderMovements30Days = await prisma.stockMovement.findMany({
    where: {
      product: { accountId },
      reason: MoveReason.ORDER,
      createdAt: { gte: thirtyDaysAgo },
    },
    select: {
      productId: true,
      warehouseId: true,
      delta: true,
    },
  });

  // Sum order units per product (only from stocked warehouses)
  const productOrderUnits30d = new Map<string, number>();
  for (const m of orderMovements30Days) {
    if (stockedWarehousePairs.has(`${m.productId}:${m.warehouseId}`)) {
      const cur = productOrderUnits30d.get(m.productId) ?? 0;
      productOrderUnits30d.set(m.productId, cur + Math.abs(m.delta));
    }
  }

  let stockoutWithin7DaysCount = 0;
  const runningLowEligible: DashboardRunningLowItem[] = [];

  for (const item of computedProductStatuses) {
    const soldUnits = productOrderUnits30d.get(item.product.id) ?? 0;
    const avgDaily = soldUnits / 30;

    let daysLeft: number | null = null;
    if (avgDaily > 0) {
      daysLeft = Math.round(item.available / avgDaily);
    }

    if (daysLeft !== null && daysLeft <= 7) {
      stockoutWithin7DaysCount++;
    }

    if (daysLeft !== null) {
      runningLowEligible.push({
        id: item.product.id,
        sku: item.product.sku,
        name: item.product.name,
        swatch: item.product.swatch,
        available: item.available,
        daysOfStockLeft: daysLeft,
        status: item.status,
      });
    }
  }

  // 5 non-bundle SKUs with the fewest days of stock left
  runningLowEligible.sort((a, b) => a.daysOfStockLeft - b.daysOfStockLeft);
  const runningLow = runningLowEligible.slice(0, 5);

  // 6. Orders Chart (24h per hour, or 7d/30d per day)
  let chartBars: DashboardOrderBar[] = [];
  let chartTotalUnits = 0;

  if (range === "24h") {
    // 24 hourly buckets ending at current hour
    const currentHourTimestamp = new Date(now);
    currentHourTimestamp.setMinutes(0, 0, 0);

    const start24h = new Date(currentHourTimestamp.getTime() - 23 * 60 * 60 * 1000);
    const movements24h = await prisma.stockMovement.findMany({
      where: {
        product: { accountId },
        reason: MoveReason.ORDER,
        createdAt: { gte: start24h },
      },
      select: { delta: true, createdAt: true },
    });

    const hourlyUnits = new Array<number>(24).fill(0);
    for (const m of movements24h) {
      const diffHours = Math.floor(
        (currentHourTimestamp.getTime() - m.createdAt.getTime()) / (60 * 60 * 1000)
      );
      const bucketIdx = 23 - diffHours;
      if (bucketIdx >= 0 && bucketIdx < 24) {
        hourlyUnits[bucketIdx] += Math.abs(m.delta);
      }
    }

    chartBars = hourlyUnits.map((units, idx) => {
      const hourDate = new Date(start24h.getTime() + idx * 60 * 60 * 1000);
      const isCurrent = idx === 23;
      const label = hourDate.toLocaleTimeString("en-US", {
        timeZone: APP_TIMEZONE,
        hour: "numeric",
      });
      const fullLabel = `${hourDate.toLocaleDateString("en-US", {
        timeZone: APP_TIMEZONE,
        month: "short",
        day: "numeric",
      })} ${label}`;

      chartTotalUnits += units;
      return { label, fullLabel, units, isCurrent };
    });
  } else {
    const daysCount = range === "7d" ? 7 : 30;
    const startPeriodMidnight = new Date(
      todayMidnight.getTime() - (daysCount - 1) * 24 * 60 * 60 * 1000
    );

    const movementsDays = await prisma.stockMovement.findMany({
      where: {
        product: { accountId },
        reason: MoveReason.ORDER,
        createdAt: { gte: startPeriodMidnight },
      },
      select: { delta: true, createdAt: true },
    });

    const dailyUnits = new Array<number>(daysCount).fill(0);
    for (const m of movementsDays) {
      const mMidnight = getLocalMidnight(m.createdAt);
      const diffDays = Math.round(
        (todayMidnight.getTime() - mMidnight.getTime()) / (24 * 60 * 60 * 1000)
      );
      const bucketIdx = daysCount - 1 - diffDays;
      if (bucketIdx >= 0 && bucketIdx < daysCount) {
        dailyUnits[bucketIdx] += Math.abs(m.delta);
      }
    }

    chartBars = dailyUnits.map((units, idx) => {
      const daysAgo = daysCount - 1 - idx;
      const dateAtDay = new Date(todayMidnight.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      const isCurrent = idx === daysCount - 1;
      const label =
        daysCount === 7
          ? dateAtDay.toLocaleDateString("en-US", {
              timeZone: APP_TIMEZONE,
              weekday: "short",
            })
          : dateAtDay.toLocaleDateString("en-US", {
              timeZone: APP_TIMEZONE,
              month: "short",
              day: "numeric",
            });
      const fullLabel = `${dateAtDay.toLocaleDateString("en-US", {
        timeZone: APP_TIMEZONE,
        month: "short",
        day: "numeric",
      })} (${units} units)`;

      chartTotalUnits += units;
      return { label, fullLabel, units, isCurrent };
    });
  }

  const chartMaxUnits = Math.max(...chartBars.map((b) => b.units), 1);
  const chartAvgUnits =
    chartBars.length > 0 ? Math.round(chartTotalUnits / chartBars.length) : 0;

  // 7. Channels List
  const channels: DashboardChannelItem[] = channelsRaw.map((ch) => ({
    id: ch.id,
    name: ch.name,
    type: ch.type,
    status: ch.status,
    storeRef: ch.storeRef,
    listingCount: ch._count.listings,
    lastSyncedAt: ch.lastSyncedAt,
  }));

  // 8. Live Sync Feed: Latest 10 movements for the account
  const latest10Movements = await prisma.stockMovement.findMany({
    where: { product: { accountId } },
    include: {
      product: {
        select: { sku: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const liveFeed: DashboardLiveFeedItem[] = latest10Movements.map((m) => ({
    id: m.id,
    delta: m.delta,
    reason: m.reason,
    refLabel: m.refLabel,
    productName: m.product.name,
    sku: m.product.sku,
    warehouseName: warehouseMap.get(m.warehouseId) ?? "Warehouse",
    timeAgo: formatRelativeTime(m.createdAt),
    createdAt: m.createdAt,
  }));

  return {
    lastPushPill,
    kpis: {
      availableUnits: {
        label: "Available units",
        value: totalAvailableUnits,
        delta: availableDelta,
        sparkline: sparkline14,
        note: "Total available across all warehouses",
      },
      ordersToday: {
        label: "Orders today",
        value: distinctOrdersToday,
        sparkline: ordersSparkline14,
        note: "From stock movements until order sync is live",
      },
      lowStockSkus: {
        label: "Low-stock SKUs",
        value: lowStockCount,
        sparkline: sparkline14.slice(-14).reverse(),
        note: `${stockoutWithin7DaysCount} will stock out within 7 days`,
      },
      heldByCloseAt: {
        label: "Held by close-at",
        value: heldByCloseAtCount,
        sparkline: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, heldByCloseAtCount],
        note: "Stock reserved by safety thresholds",
      },
    },
    ordersChart: {
      range,
      bars: chartBars,
      totalUnits: chartTotalUnits,
      avgUnits: chartAvgUnits,
      maxUnits: chartMaxUnits,
    },
    channels,
    runningLow,
    liveFeed,
    warehouses: warehouses.map((w) => ({
      id: w.id,
      name: w.name,
      kind: w.kind,
    })),
    selectableProducts: products.map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      isBundle: false,
      warehouses: warehouses.map((wh) => {
        const lvl = p.stockLevels.find((sl) => sl.warehouseId === wh.id);
        return {
          warehouseId: wh.id,
          warehouseName: wh.name,
          onHand: lvl?.onHand ?? 0,
          booked: lvl?.booked ?? 0,
        };
      }),
    })),
  };
}
