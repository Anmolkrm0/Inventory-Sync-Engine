import { prisma } from "@/server/db";
import { pushQty } from "@/server/stock";

export interface ComponentSets {
  componentId: string;
  sets: number;
}

export interface BundleAvailabilityResult {
  available: number;
  limitingComponentId: string | null;
  perComponent: ComponentSets[];
}

/**
 * Computes bundle availability PER WAREHOUSE:
 * Parts must be in the same warehouse to assemble and ship a set.
 * Filtered by accountId.
 *
 * sets_w = min over components of floor(pushQty(component at w) / qty)
 * bundle available = sum of sets_w across all warehouses.
 *
 * Returns { available, limitingComponentId, perComponent: [{ componentId, sets }] }
 * where perComponent.sets is the total sets that component allows across warehouses,
 * and limitingComponentId is the component with the fewest sets.
 */
export async function bundleAvailable(
  accountId: string,
  bundleId: string
): Promise<BundleAvailabilityResult> {
  const bundle = await prisma.product.findFirst({
    where: { id: bundleId, accountId },
    include: {
      bundleComponents: {
        include: {
          component: {
            include: {
              stockLevels: {
                where: {
                  warehouse: {
                    accountId,
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!bundle || !bundle.isBundle || bundle.bundleComponents.length === 0) {
    return {
      available: 0,
      limitingComponentId: null,
      perComponent: [],
    };
  }

  // Fetch all warehouses belonging to this account
  const warehouses = await prisma.warehouse.findMany({
    where: { accountId },
    select: { id: true },
  });

  // Track sets each component allows across all warehouses
  const componentTotalSets = new Map<string, number>();
  for (const bc of bundle.bundleComponents) {
    componentTotalSets.set(bc.componentId, 0);
  }

  let totalBundleAvailable = 0;

  // Compute availability per warehouse
  for (const wh of warehouses) {
    let warehouseSets = Infinity;

    for (const bc of bundle.bundleComponents) {
      const stockLevel = bc.component.stockLevels.find(
        (sl) => sl.warehouseId === wh.id
      );

      let componentPushQty = 0;
      if (stockLevel && stockLevel.stocked) {
        componentPushQty = pushQty(stockLevel);
      }

      const setsForComponentInWh = Math.floor(componentPushQty / bc.qty);

      // Add to this component's running total across warehouses
      const currentTotal = componentTotalSets.get(bc.componentId) ?? 0;
      componentTotalSets.set(
        bc.componentId,
        currentTotal + setsForComponentInWh
      );

      if (setsForComponentInWh < warehouseSets) {
        warehouseSets = setsForComponentInWh;
      }
    }

    if (warehouseSets !== Infinity && warehouseSets > 0) {
      totalBundleAvailable += warehouseSets;
    }
  }

  const perComponent: ComponentSets[] = bundle.bundleComponents.map((bc) => ({
    componentId: bc.componentId,
    sets: componentTotalSets.get(bc.componentId) ?? 0,
  }));

  // limitingComponentId is the one with the fewest sets allowed across warehouses
  let limitingComponentId: string | null = null;
  let minSets = Infinity;

  for (const item of perComponent) {
    if (item.sets < minSets) {
      minSets = item.sets;
      limitingComponentId = item.componentId;
    }
  }

  return {
    available: totalBundleAvailable,
    limitingComponentId,
    perComponent,
  };
}
