import { prisma } from "@/server/db";
import { getLocalMidnight, APP_TIMEZONE } from "@/server/timezone";
import { available as computeAvailable } from "@/server/stock";

export interface AvailableHistoryOptions {
  productIds?: string[];
  days?: number;
}

export interface DailyHistoryPoint {
  date: string;
  dayLabel: string;
  available: number;
}

export interface AvailableHistoryResult {
  points: DailyHistoryPoint[];
  values: number[];
  currentAvailable: number;
}

/**
 * Computes daily historical available stock by walking backwards from current stock levels
 * using only movements from stocked warehouses in APP_TIMEZONE.
 * StockMovement has no accountId directly, so we filter by product: { accountId }.
 */
export async function availableHistory(
  accountId: string,
  options: AvailableHistoryOptions = {}
): Promise<AvailableHistoryResult> {
  const days = options.days ?? 14;

  // 1. Fetch products and stocked warehouse stock levels
  const products = await prisma.product.findMany({
    where: {
      accountId,
      isBundle: false,
      ...(options.productIds ? { id: { in: options.productIds } } : {}),
    },
    include: {
      stockLevels: {
        where: { stocked: true },
        select: {
          productId: true,
          warehouseId: true,
          onHand: true,
          booked: true,
        },
      },
    },
  });

  // Calculate current available stock across all target products & stocked warehouses
  let currentTotalAvailable = 0;
  const stockedPairs = new Set<string>();

  for (const p of products) {
    for (const sl of p.stockLevels) {
      currentTotalAvailable += computeAvailable(sl);
      stockedPairs.add(`${sl.productId}:${sl.warehouseId}`);
    }
  }

  // 2. Compute date boundaries in APP_TIMEZONE
  const now = new Date();
  const todayMidnight = getLocalMidnight(now);
  const startMidnight = new Date(
    todayMidnight.getTime() - (days - 1) * 24 * 60 * 60 * 1000
  );

  // 3. Query StockMovements for the account over the period
  const movements = await prisma.stockMovement.findMany({
    where: {
      product: { accountId },
      ...(options.productIds ? { productId: { in: options.productIds } } : {}),
      createdAt: { gte: startMidnight },
    },
    select: {
      productId: true,
      warehouseId: true,
      delta: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // 4. Group movements by day into dailyDeltas (only from stocked warehouses)
  const dailyDeltas = new Array<number>(days).fill(0);

  for (const m of movements) {
    if (!stockedPairs.has(`${m.productId}:${m.warehouseId}`)) {
      continue;
    }

    const movementMidnight = getLocalMidnight(m.createdAt);
    const diffDays = Math.round(
      (todayMidnight.getTime() - movementMidnight.getTime()) /
        (24 * 60 * 60 * 1000)
    );
    const dayIndex = days - 1 - diffDays;

    if (dayIndex >= 0 && dayIndex < days) {
      dailyDeltas[dayIndex] += m.delta;
    }
  }

  // 5. Walk backwards from today's current available stock
  const points: DailyHistoryPoint[] = new Array(days);
  let rollingStock = currentTotalAvailable;

  for (let i = days - 1; i >= 0; i--) {
    const daysAgo = days - 1 - i;
    const dateAtDay = new Date(todayMidnight.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const dateStr = dateAtDay.toLocaleDateString("en-US", {
      timeZone: APP_TIMEZONE,
      month: "short",
      day: "numeric",
    });
    const dayLabel = `${daysAgo === 0 ? "Today" : `${daysAgo}d ago`} (${dateStr})`;

    points[i] = {
      date: dateStr,
      dayLabel,
      available: Math.max(0, rollingStock),
    };

    rollingStock = rollingStock - dailyDeltas[i];
  }

  return {
    points,
    values: points.map((p) => p.available),
    currentAvailable: currentTotalAvailable,
  };
}
