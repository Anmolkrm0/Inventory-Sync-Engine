import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { prisma, pool } from "@/server/db";
import { getInventoryData } from "@/server/inventory";
import { adjustStockAction } from "@/app/(app)/inventory/actions";
import { resetCachedAccountId } from "@/server/account";
import { ChannelType, MoveReason } from "@prisma/client";

// Mock next/cache revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Inventory Data Layer & Actions (Real PostgreSQL)", () => {
  let accountId: string;
  let warehouseId: string;
  let warehouse2Id: string;
  let channelId: string;
  let productId: string;

  beforeEach(async () => {
    resetCachedAccountId();

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
      data: { name: "Acme Test Corp" },
    });
    accountId = account.id;

    const warehouse = await prisma.warehouse.create({
      data: {
        accountId,
        name: "Main warehouse",
        kind: "Own",
        sortOrder: 1,
      },
    });
    warehouseId = warehouse.id;

    const warehouse2 = await prisma.warehouse.create({
      data: {
        accountId,
        name: "3PL East",
        kind: "3PL",
        sortOrder: 2,
      },
    });
    warehouse2Id = warehouse2.id;

    const channel = await prisma.channel.create({
      data: {
        accountId,
        name: "Shopify US",
        type: ChannelType.SHOPIFY,
        storeRef: "test.myshopify.com",
      },
    });
    channelId = channel.id;

    const product = await prisma.product.create({
      data: {
        accountId,
        sku: "MUG-001",
        name: "Test Mug",
        barcode: "123456789",
        category: "Kitchen",
        swatch: "#2A44C9",
        stockLevels: {
          create: [
            {
              warehouseId,
              onHand: 20,
              booked: 5,
              closeAt: 2,
              minLevel: 10,
              stocked: true,
            },
            {
              warehouseId: warehouse2Id,
              onHand: 10,
              booked: 0,
              closeAt: 5, // Differs from warehouse 1 -> Close at display should be 'Varies'!
              minLevel: 5,
              stocked: true,
            },
          ],
        },
        listings: {
          create: {
            channelId,
            externalId: "ext-1",
            title: "Test Mug on Shopify",
            lastPushedQty: 15,
            lastPushedAt: new Date(Date.now() - 5 * 60 * 1000), // 5 min ago
          },
        },
      },
    });
    productId = product.id;

    // Create 2 unlinked listings (productId: null) on Etsy
    const etsyChannel = await prisma.channel.create({
      data: {
        accountId,
        name: "Etsy",
        type: ChannelType.ETSY,
        storeRef: "etsy.com/shop/test",
      },
    });

    await prisma.listing.createMany({
      data: [
        {
          channelId: etsyChannel.id,
          productId: null,
          externalId: "ETSY-UNLINKED-01",
          title: "Terracotta Planter 6in",
          channelQty: 4,
        },
        {
          channelId: etsyChannel.id,
          productId: null,
          externalId: "ETSY-UNLINKED-02",
          title: "Woven Macrame Plant Hanger",
          channelQty: 8,
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

  it("getInventoryData computes available, status, channels, tabs, and varies close-at correctly", async () => {
    const data = await getInventoryData();

    expect(data.items.length).toBe(1);
    const item = data.items[0];
    expect(item.sku).toBe("MUG-001");
    expect(item.onHand).toBe(30); // 20 + 10
    expect(item.booked).toBe(5);
    expect(item.available).toBe(25); // 15 + 10
    expect(item.status).toBe("Healthy");
    expect(item.closeAtDisplay).toBe("Varies"); // 2 != 5 -> 'Varies'
    expect(item.channels.length).toBe(1);
    expect(item.channels[0].name).toBe("Shopify US");
    expect(item.lastPush).toContain("m ago");

    // Unlinked listings tab count is 2
    expect(data.tabs.all).toBe(1);
    expect(data.tabs.unlinked).toBe(2);
    expect(data.unlinkedListings.length).toBe(2);
    expect(data.unlinkedListings[0].externalId).toBe("ETSY-UNLINKED-01");
  });

  it("warehouse filter hides products not stocked in that warehouse", async () => {
    // Create an unstocked product in warehouse2
    await prisma.product.create({
      data: {
        accountId,
        sku: "PEN-002",
        name: "Brass Pen",
        stockLevels: {
          create: {
            warehouseId,
            onHand: 15,
            stocked: true,
          },
        },
      },
    });

    const wh1Data = await getInventoryData({ warehouseId });
    // Sorted by product name ascending: "Brass Pen" (PEN-002) comes before "Test Mug" (MUG-001)
    expect(wh1Data.items.map((i) => i.sku)).toEqual(["PEN-002", "MUG-001"]);

    // In warehouse2, PEN-002 is not stocked so it must be hidden!
    const wh2Data = await getInventoryData({ warehouseId: warehouse2Id });
    expect(wh2Data.items.map((i) => i.sku)).toEqual(["MUG-001"]);
    expect(wh2Data.items[0].closeAtDisplay).toBe("5");
  });

  it("filters by search query q across SKU, name, and barcode", async () => {
    const bySku = await getInventoryData({ q: "MUG-001" });
    expect(bySku.items.length).toBe(1);

    const byName = await getInventoryData({ q: "Test Mug" });
    expect(byName.items.length).toBe(1);

    const byBarcode = await getInventoryData({ q: "123456789" });
    expect(byBarcode.items.length).toBe(1);

    const noMatch = await getInventoryData({ q: "nonexistent" });
    expect(noMatch.items.length).toBe(0);
  });

  it("adjustStockAction in adjust mode successfully modifies onHand and logs StockMovement", async () => {
    const result = await adjustStockAction({
      productId,
      warehouseId,
      mode: "adjust",
      quantity: 5,
      reason: MoveReason.MANUAL,
      refLabel: "Test Add",
    });

    expect(result.ok).toBe(true);

    const updatedLevel = await prisma.stockLevel.findUniqueOrThrow({
      where: {
        productId_warehouseId: { productId, warehouseId },
      },
    });
    expect(updatedLevel.onHand).toBe(25);

    const movement = await prisma.stockMovement.findFirst({
      where: { productId, warehouseId },
      orderBy: { createdAt: "desc" },
    });
    expect(movement?.delta).toBe(5);
    expect(movement?.refLabel).toBe("Test Add");
  });

  it("adjustStockAction in set mode computes stocktake delta and updates onHand", async () => {
    const result = await adjustStockAction({
      productId,
      warehouseId,
      mode: "set",
      quantity: 40,
      reason: MoveReason.STOCKTAKE,
      refLabel: "Cycle Count",
    });

    expect(result.ok).toBe(true);

    const updatedLevel = await prisma.stockLevel.findUniqueOrThrow({
      where: {
        productId_warehouseId: { productId, warehouseId },
      },
    });
    expect(updatedLevel.onHand).toBe(40);
  });

  it("adjustStockAction returns friendly error carrying onHand when stock is insufficient", async () => {
    const result = await adjustStockAction({
      productId,
      warehouseId,
      mode: "adjust",
      quantity: -100, // On hand in warehouse 1 is 20!
      reason: MoveReason.MANUAL,
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe("INSUFFICIENT_STOCK");
    expect(result.message).toBe("Not enough stock: only 20 on hand");
  });

  it("adjustStockAction validates mode and quantity limits", async () => {
    // Invalid mode
    const badMode = await adjustStockAction({
      productId,
      warehouseId,
      // @ts-expect-error testing invalid mode
      mode: "invalid_mode",
      quantity: 5,
      reason: MoveReason.MANUAL,
    });
    expect(badMode.ok).toBe(false);
    expect(badMode.message).toBe("Mode must be 'adjust' or 'set'.");

    // Quantity exceeding limit
    const hugeQty = await adjustStockAction({
      productId,
      warehouseId,
      mode: "adjust",
      quantity: 2_000_000,
      reason: MoveReason.MANUAL,
    });
    expect(hugeQty.ok).toBe(false);
    expect(hugeQty.message).toBe(
      "Quantity must be an integer between -1,000,000 and 1,000,000."
    );
  });

  it("sorts inventory items by product name ascending, not SKU", async () => {
    await prisma.product.createMany({
      data: [
        { accountId, sku: "ZZZ-999", name: "Apple Sticker" },
        { accountId, sku: "AAA-111", name: "Zebra Notebook" },
      ],
    });

    const data = await getInventoryData();
    const names = data.items.map((i) => i.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
});
