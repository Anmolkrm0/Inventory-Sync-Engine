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
          create: {
            warehouseId,
            onHand: 20,
            booked: 5,
            closeAt: 2,
            minLevel: 10,
            stocked: true,
          },
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
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

  it("getInventoryData computes available, status, channels, and tabs correctly", async () => {
    const data = await getInventoryData();

    expect(data.items.length).toBe(1);
    const item = data.items[0];
    expect(item.sku).toBe("MUG-001");
    expect(item.onHand).toBe(20);
    expect(item.booked).toBe(5);
    expect(item.available).toBe(15); // 20 - 5
    expect(item.status).toBe("Healthy");
    expect(item.channels.length).toBe(1);
    expect(item.channels[0].name).toBe("Shopify US");
    expect(item.lastPush).toContain("m ago");

    expect(data.tabs.all).toBe(1);
    expect(data.tabs.low_stock).toBe(0);
    expect(data.tabs.sold_out).toBe(0);
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

  it("adjustStockAction returns friendly error when stock is insufficient", async () => {
    const result = await adjustStockAction({
      productId,
      warehouseId,
      mode: "adjust",
      quantity: -100, // On hand is only 20!
      reason: MoveReason.MANUAL,
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe("INSUFFICIENT_STOCK");
    expect(result.message).toBe("Not enough stock: only 20 on hand");
  });
});
