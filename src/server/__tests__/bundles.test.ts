import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma, pool } from "@/server/db";
import {
  bundleAvailable,
  listBundlesWithAvailability,
  bundleStatusFor,
  BUNDLE_LOW_STOCK,
} from "@/server/bundles";
import { ChannelType } from "@prisma/client";

describe("Bundle Availability & Engine (Real PostgreSQL)", () => {
  let accountId: string;
  let warehouse1Id: string;
  let warehouse2Id: string;
  let channelId: string;

  beforeEach(async () => {
    await prisma.stockMovement.deleteMany();
    await prisma.bundleComponent.deleteMany();
    await prisma.listing.deleteMany();
    await prisma.stockLevel.deleteMany();
    await prisma.product.deleteMany();
    await prisma.warehouse.deleteMany();
    await prisma.channel.deleteMany();
    await prisma.user.deleteMany();
    await prisma.account.deleteMany();

    const account = await prisma.account.create({
      data: { name: "Bundle Test Corp" },
    });
    accountId = account.id;

    const w1 = await prisma.warehouse.create({
      data: {
        accountId,
        name: "Main warehouse",
        kind: "Own",
        sortOrder: 1,
      },
    });
    warehouse1Id = w1.id;

    const w2 = await prisma.warehouse.create({
      data: {
        accountId,
        name: "3PL East",
        kind: "3PL",
        sortOrder: 2,
      },
    });
    warehouse2Id = w2.id;

    const channel = await prisma.channel.create({
      data: {
        accountId,
        name: "Shopify US",
        type: ChannelType.SHOPIFY,
        storeRef: "bundle-test.myshopify.com",
      },
    });
    channelId = channel.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

  it("calculates bundle availability and limiting component correctly within a warehouse", async () => {
    // Component A: 20 on hand, 0 booked -> 20 available. Bundle needs 2 per set -> 10 sets
    const compA = await prisma.product.create({
      data: {
        accountId,
        sku: "COMP-A",
        name: "Component A",
        stockLevels: {
          create: {
            warehouseId: warehouse1Id,
            onHand: 20,
            booked: 0,
            closeAt: 0,
            stocked: true,
          },
        },
      },
    });

    // Component B: 6 on hand, 0 booked -> 6 available. Bundle needs 1 per set -> 6 sets (LIMITING!)
    const compB = await prisma.product.create({
      data: {
        accountId,
        sku: "COMP-B",
        name: "Component B",
        stockLevels: {
          create: {
            warehouseId: warehouse1Id,
            onHand: 6,
            booked: 0,
            closeAt: 0,
            stocked: true,
          },
        },
      },
    });

    // Create Bundle
    const bundle = await prisma.product.create({
      data: {
        accountId,
        sku: "BUN-01",
        name: "Test Bundle 01",
        isBundle: true,
        bundleComponents: {
          create: [
            { componentId: compA.id, qty: 2 },
            { componentId: compB.id, qty: 1 },
          ],
        },
        listings: {
          create: {
            channelId,
            externalId: "ext-bun-01",
            title: "Test Bundle 01 on Shopify",
          },
        },
      },
    });

    const res = await bundleAvailable(accountId, bundle.id);
    expect(res.available).toBe(6);
    expect(res.limitingComponentId).toBe(compB.id);

    // Test listBundlesWithAvailability
    const list = await listBundlesWithAvailability(accountId);
    expect(list.length).toBe(1);
    const item = list[0];
    expect(item.sku).toBe("BUN-01");
    expect(item.available).toBe(6);
    expect(item.status).toBe("Healthy"); // 6 > BUNDLE_LOW_STOCK (5)
    expect(item.limitingComponentName).toBe("Component B");
    expect(item.isSplitAcrossWarehouses).toBe(false);
    expect(item.channels.length).toBe(1);

    // Component math verification: "X available ÷ Y per set"
    const compAItem = item.components.find((c) => c.componentId === compA.id);
    expect(compAItem?.available).toBe(20);
    expect(compAItem?.qtyPerSet).toBe(2);
    expect(compAItem?.sets).toBe(10);
    expect(compAItem?.isLimiting).toBe(false);

    const compBItem = item.components.find((c) => c.componentId === compB.id);
    expect(compBItem?.available).toBe(6);
    expect(compBItem?.qtyPerSet).toBe(1);
    expect(compBItem?.sets).toBe(6);
    expect(compBItem?.isLimiting).toBe(true);
  });

  it("detects split parts across warehouses when co-location is missing", async () => {
    // Component A is ONLY in warehouse 1 (10 units)
    const compA = await prisma.product.create({
      data: {
        accountId,
        sku: "SPLIT-A",
        name: "Split Part A",
        stockLevels: {
          create: [
            {
              warehouseId: warehouse1Id,
              onHand: 10,
              closeAt: 0,
              stocked: true,
            },
            {
              warehouseId: warehouse2Id,
              onHand: 0,
              closeAt: 0,
              stocked: true,
            },
          ],
        },
      },
    });

    // Component B is ONLY in warehouse 2 (10 units)
    const compB = await prisma.product.create({
      data: {
        accountId,
        sku: "SPLIT-B",
        name: "Split Part B",
        stockLevels: {
          create: [
            {
              warehouseId: warehouse1Id,
              onHand: 0,
              closeAt: 0,
              stocked: true,
            },
            {
              warehouseId: warehouse2Id,
              onHand: 10,
              closeAt: 0,
              stocked: true,
            },
          ],
        },
      },
    });

    await prisma.product.create({
      data: {
        accountId,
        sku: "BUN-SPLIT",
        name: "Split Warehouse Bundle",
        isBundle: true,
        bundleComponents: {
          create: [
            { componentId: compA.id, qty: 1 },
            { componentId: compB.id, qty: 1 },
          ],
        },
      },
    });

    const list = await listBundlesWithAvailability(accountId);
    const item = list.find((b) => b.sku === "BUN-SPLIT")!;

    // Both parts allow 10 sets across the account, BUT in Wh1 sets=0, in Wh2 sets=0
    // Total bundle available is 0!
    expect(item.available).toBe(0);
    expect(item.limitingComponentSets).toBe(10);
    expect(item.isSplitAcrossWarehouses).toBe(true);
    expect(item.status).toBe("Sold out");
  });

  it("detects when a component is held by close-at threshold", async () => {
    // Component with onHand 4, closeAt 4 -> available=4, but pushQty=0!
    const compHeld = await prisma.product.create({
      data: {
        accountId,
        sku: "HELD-COMP",
        name: "Held Component",
        stockLevels: {
          create: {
            warehouseId: warehouse1Id,
            onHand: 4,
            booked: 0,
            closeAt: 4, // Held at 0!
            stocked: true,
          },
        },
      },
    });

    const compOther = await prisma.product.create({
      data: {
        accountId,
        sku: "NORM-COMP",
        name: "Normal Component",
        stockLevels: {
          create: {
            warehouseId: warehouse1Id,
            onHand: 10,
            closeAt: 0,
            stocked: true,
          },
        },
      },
    });

    await prisma.product.create({
      data: {
        accountId,
        sku: "BUN-HELD",
        name: "Held Bundle",
        isBundle: true,
        bundleComponents: {
          create: [
            { componentId: compHeld.id, qty: 1 },
            { componentId: compOther.id, qty: 1 },
          ],
        },
      },
    });

    const list = await listBundlesWithAvailability(accountId);
    const item = list.find((b) => b.sku === "BUN-HELD")!;

    expect(item.available).toBe(0);
    const heldPart = item.components.find((c) => c.componentId === compHeld.id);
    expect(heldPart?.isHeldByCloseAt).toBe(true);
  });

  it("bundleStatusFor respects BUNDLE_LOW_STOCK threshold", () => {
    expect(bundleStatusFor(0)).toBe("Sold out");
    expect(bundleStatusFor(1)).toBe("Low stock");
    expect(bundleStatusFor(BUNDLE_LOW_STOCK)).toBe("Low stock");
    expect(bundleStatusFor(BUNDLE_LOW_STOCK + 1)).toBe("Healthy");
    expect(bundleStatusFor(100)).toBe("Healthy");
  });
});
