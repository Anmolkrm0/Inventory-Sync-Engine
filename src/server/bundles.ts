import { prisma } from "@/server/db";
import {
  pushQty,
  available as computeAvailable,
  type StockStatus,
} from "@/server/stock";
import type { ChannelType } from "@prisma/client";

export const BUNDLE_LOW_STOCK = 5;

export function bundleStatusFor(available: number): StockStatus {
  if (available <= 0) return "Sold out";
  if (available <= BUNDLE_LOW_STOCK) return "Low stock";
  return "Healthy";
}

export interface ComponentSets {
  componentId: string;
  sets: number;
}

export interface BundleAvailabilityResult {
  available: number;
  limitingComponentId: string | null;
  perComponent: ComponentSets[];
}

export interface BundleComponentItem {
  componentId: string;
  sku: string;
  name: string;
  swatch: string | null;
  qtyPerSet: number;
  available: number; // Sum of pushQty over stocked warehouses
  sets: number; // Math.floor(available / qtyPerSet)
  isLimiting: boolean;
  isHeldByCloseAt: boolean;
}

export interface BundleChannel {
  id: string;
  name: string;
  type: ChannelType;
}

export interface BundleDetailItem {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  swatch: string | null;
  costCents: number;
  available: number;
  status: StockStatus;
  limitingComponentId: string | null;
  limitingComponentName: string | null;
  limitingComponentSets: number;
  isSplitAcrossWarehouses: boolean;
  channels: BundleChannel[];
  components: BundleComponentItem[];
  maxSets: number;
}

export interface RawBundleWithComponents {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  swatch: string | null;
  costCents: number;
  listings?: {
    channel: { id: string; name: string; type: ChannelType };
  }[];
  bundleComponents: {
    qty: number;
    component: {
      id: string;
      sku: string;
      name: string;
      swatch: string | null;
      stockLevels: {
        warehouseId: string;
        onHand: number;
        booked: number;
        closeAt: number;
        stocked: boolean;
      }[];
    };
  }[];
}

/**
 * Pure calculation helper: Computes bundle availability per warehouse,
 * component sets, limiting component, and split warehouse detection in memory.
 */
export function computeBundleAvailability(
  bundle: RawBundleWithComponents,
  warehouseIds: string[]
): BundleDetailItem {
  if (bundle.bundleComponents.length === 0) {
    return {
      id: bundle.id,
      sku: bundle.sku,
      name: bundle.name,
      category: bundle.category,
      swatch: bundle.swatch,
      costCents: bundle.costCents,
      available: 0,
      status: "Sold out",
      limitingComponentId: null,
      limitingComponentName: null,
      limitingComponentSets: 0,
      isSplitAcrossWarehouses: false,
      channels: [],
      components: [],
      maxSets: 1,
    };
  }

  // 1. Compute physical availability per warehouse (parts must be co-located to ship)
  let totalBundleAvailable = 0;

  for (const whId of warehouseIds) {
    let warehouseSets = Infinity;

    for (const bc of bundle.bundleComponents) {
      const stockLevel = bc.component.stockLevels.find(
        (sl) => sl.warehouseId === whId && sl.stocked
      );

      const componentPushQty = stockLevel ? pushQty(stockLevel) : 0;
      const setsInWh = Math.floor(componentPushQty / bc.qty);

      if (setsInWh < warehouseSets) {
        warehouseSets = setsInWh;
      }
    }

    if (warehouseSets !== Infinity && warehouseSets > 0) {
      totalBundleAvailable += warehouseSets;
    }
  }

  // 2. Compute component-level numbers:
  // Component rows show "X available ÷ Y per set" where X = sum of pushQty over stocked warehouses
  const componentItems: BundleComponentItem[] = bundle.bundleComponents.map(
    (bc) => {
      const stockedLevels = bc.component.stockLevels.filter(
        (sl) => sl.stocked && warehouseIds.includes(sl.warehouseId)
      );

      const componentPushQty = stockedLevels.reduce(
        (acc, sl) => acc + pushQty(sl),
        0
      );

      const componentRawAvailable = stockedLevels.reduce(
        (acc, sl) => acc + computeAvailable(sl),
        0
      );

      const sets = Math.floor(componentPushQty / bc.qty);

      // Held by close-at: has available stock, but pushQty was reduced to 0 (or insufficient for even 1 set) due to close-at
      const isHeldByCloseAt =
        componentRawAvailable > 0 &&
        componentPushQty === 0 &&
        componentRawAvailable >= bc.qty;

      return {
        componentId: bc.component.id,
        sku: bc.component.sku,
        name: bc.component.name,
        swatch: bc.component.swatch,
        qtyPerSet: bc.qty,
        available: componentPushQty,
        sets,
        isLimiting: false,
        isHeldByCloseAt,
      };
    }
  );

  // 3. Find limiting component: the component that produces the fewest sets
  let minSets = Infinity;
  let limitingComponentId: string | null = null;
  let limitingComponentName: string | null = null;

  for (const c of componentItems) {
    if (c.sets < minSets) {
      minSets = c.sets;
      limitingComponentId = c.componentId;
      limitingComponentName = c.name;
    }
  }

  if (limitingComponentId) {
    for (const c of componentItems) {
      if (c.componentId === limitingComponentId) {
        c.isLimiting = true;
      }
    }
  }

  const limitingComponentSets = minSets === Infinity ? 0 : minSets;

  // Split warehouse detection: totalBundleAvailable < limitingComponentSets
  const isSplitAcrossWarehouses =
    limitingComponentSets > 0 && totalBundleAvailable < limitingComponentSets;

  const maxSets = Math.max(...componentItems.map((c) => c.sets), 1);

  // Deduplicate channels from listings
  const channelsMap = new Map<string, BundleChannel>();
  for (const l of bundle.listings ?? []) {
    channelsMap.set(l.channel.id, {
      id: l.channel.id,
      name: l.channel.name,
      type: l.channel.type,
    });
  }

  return {
    id: bundle.id,
    sku: bundle.sku,
    name: bundle.name,
    category: bundle.category,
    swatch: bundle.swatch,
    costCents: bundle.costCents,
    available: totalBundleAvailable,
    status: bundleStatusFor(totalBundleAvailable),
    limitingComponentId,
    limitingComponentName,
    limitingComponentSets,
    isSplitAcrossWarehouses,
    channels: Array.from(channelsMap.values()),
    components: componentItems,
    maxSets,
  };
}

/**
 * Loads all bundles with components and warehouse stock levels in a single query,
 * computing real-time availability and limiting parts in memory.
 */
export async function listBundlesWithAvailability(
  accountId: string
): Promise<BundleDetailItem[]> {
  const [warehouses, bundles] = await Promise.all([
    prisma.warehouse.findMany({
      where: { accountId },
      select: { id: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.product.findMany({
      where: { accountId, isBundle: true },
      include: {
        listings: {
          include: {
            channel: {
              select: { id: true, name: true, type: true },
            },
          },
        },
        bundleComponents: {
          include: {
            component: {
              include: {
                stockLevels: {
                  where: {
                    warehouse: { accountId },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { sku: "asc" },
    }),
  ]);

  const warehouseIds = warehouses.map((w) => w.id);

  return bundles.map((b) => computeBundleAvailability(b, warehouseIds));
}

/**
 * Computes availability for a single bundle, sharing the calculation helper.
 */
export async function bundleAvailable(
  accountId: string,
  bundleId: string
): Promise<BundleAvailabilityResult> {
  const [warehouses, bundle] = await Promise.all([
    prisma.warehouse.findMany({
      where: { accountId },
      select: { id: true },
    }),
    prisma.product.findFirst({
      where: { id: bundleId, accountId, isBundle: true },
      include: {
        bundleComponents: {
          include: {
            component: {
              include: {
                stockLevels: {
                  where: {
                    warehouse: { accountId },
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  if (!bundle || bundle.bundleComponents.length === 0) {
    return {
      available: 0,
      limitingComponentId: null,
      perComponent: [],
    };
  }

  const computed = computeBundleAvailability(
    bundle,
    warehouses.map((w) => w.id)
  );

  return {
    available: computed.available,
    limitingComponentId: computed.limitingComponentId,
    perComponent: computed.components.map((c) => ({
      componentId: c.componentId,
      sets: c.sets,
    })),
  };
}
