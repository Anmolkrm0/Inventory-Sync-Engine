import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma, pool } from "@/server/db";
import { getDashboardData } from "@/server/dashboard";
import { getConnectPageData } from "@/server/connect";
import { ChannelStatus, ChannelType, MoveReason } from "@prisma/client";

describe("Dashboard & Connect Server Layer (Real PostgreSQL)", () => {
  let accountId: string;
  let warehouse1Id: string;
  let warehouse2Id: string;
  let channel1Id: string;
  let product1Id: string;
  let product2Id: string;

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
      data: { name: "Test Corp" },
    });
    accountId = account.id;

    const wh1 = await prisma.warehouse.create({
      data: {
        accountId,
        name: "Main WH",
        kind: "Own",
        sortOrder: 1,
      },
    });
    warehouse1Id = wh1.id;

    const wh2 = await prisma.warehouse.create({
      data: {
        accountId,
        name: "Store WH",
        kind: "Store",
        sortOrder: 2,
      },
    });
    warehouse2Id = wh2.id;

    const ch = await prisma.channel.create({
      data: {
        accountId,
        name: "Shopify Store",
        type: ChannelType.SHOPIFY,
        storeRef: "test-shop.myshopify.com",
        status: ChannelStatus.LIVE,
        lastSyncedAt: new Date(),
      },
    });
    channel1Id = ch.id;

    const p1 = await prisma.product.create({
      data: {
        accountId,
        sku: "TEST-SKU-1",
        name: "Test Mug",
        category: "Drinkware",
        costCents: 500,
      },
    });
    product1Id = p1.id;

    const p2 = await prisma.product.create({
      data: {
        accountId,
        sku: "TEST-SKU-2",
        name: "Test Plate",
        category: "Tableware",
        costCents: 800,
      },
    });
    product2Id = p2.id;

    // Stock for p1: wh1 onHand 20, booked 5 => available 15
    await prisma.stockLevel.create({
      data: {
        productId: product1Id,
        warehouseId: warehouse1Id,
        onHand: 20,
        booked: 5,
        stocked: true,
      },
    });

    // Stock for p2: wh1 onHand 4, booked 1, minLevel 5 => available 3 (low stock)
    await prisma.stockLevel.create({
      data: {
        productId: product2Id,
        warehouseId: warehouse1Id,
        onHand: 4,
        booked: 1,
        minLevel: 5,
        stocked: true,
      },
    });

    // Stock for p2 in wh2: not stocked
    await prisma.stockLevel.create({
      data: {
        productId: product2Id,
        warehouseId: warehouse2Id,
        onHand: 10,
        booked: 0,
        stocked: false,
      },
    });

    // Listings: 1 matched to p1, 1 unlinked
    await prisma.listing.create({
      data: {
        channelId: channel1Id,
        productId: product1Id,
        externalId: "ext-1",
        title: "Test Mug - Shopify",
        lastPushedQty: 15,
        channelQty: 15,
        lastPushedAt: new Date(Date.now() - 5 * 60 * 1000), // 5 min ago
      },
    });

    await prisma.listing.create({
      data: {
        channelId: channel1Id,
        productId: null,
        externalId: "ext-unlinked",
        title: "Mystery Item",
        lastPushedQty: null,
        channelQty: 10,
      },
    });

    // Movements today: 2 distinct ORDER refLabels
    await prisma.stockMovement.create({
      data: {
        productId: product1Id,
        warehouseId: warehouse1Id,
        delta: -2,
        reason: MoveReason.ORDER,
        refLabel: "Order #1001 · Shopify",
        createdAt: new Date(),
      },
    });

    await prisma.stockMovement.create({
      data: {
        productId: product2Id,
        warehouseId: warehouse1Id,
        delta: -1,
        reason: MoveReason.ORDER,
        refLabel: "Order #1002 · Shopify",
        createdAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  describe("getDashboardData", () => {
    it("computes accurate KPI values and 14-day sparklines", async () => {
      const data = await getDashboardData(accountId, "24h");

      // Available units = 15 (p1) + 3 (p2 in stocked wh1) = 18
      expect(data.kpis.availableUnits.value).toBe(18);
      expect(data.kpis.availableUnits.sparkline).toHaveLength(14);

      // Orders today = 2 distinct orders
      expect(data.kpis.ordersToday.value).toBe(2);
      expect(data.kpis.ordersToday.sparkline).toHaveLength(14);

      // Low-stock SKUs = 1 (p2 has available 3 <= minLevel 5)
      expect(data.kpis.lowStockSkus.value).toBe(1);

      // Header pill contains last push time
      expect(data.lastPushPill).toContain("Live · last push");
    });

    it("generates correct number of chart bars for 24h, 7d, and 30d ranges", async () => {
      const data24h = await getDashboardData(accountId, "24h");
      expect(data24h.ordersChart.range).toBe("24h");
      expect(data24h.ordersChart.bars).toHaveLength(24);
      expect(data24h.ordersChart.bars[23].isCurrent).toBe(true);

      const data7d = await getDashboardData(accountId, "7d");
      expect(data7d.ordersChart.range).toBe("7d");
      expect(data7d.ordersChart.bars).toHaveLength(7);
      expect(data7d.ordersChart.bars[6].isCurrent).toBe(true);

      const data30d = await getDashboardData(accountId, "30d");
      expect(data30d.ordersChart.range).toBe("30d");
      expect(data30d.ordersChart.bars).toHaveLength(30);
      expect(data30d.ordersChart.bars[29].isCurrent).toBe(true);
    });

    it("returns channels, running low items, and live feed", async () => {
      const data = await getDashboardData(accountId, "24h");

      expect(data.channels).toHaveLength(1);
      expect(data.channels[0].name).toBe("Shopify Store");
      expect(data.channels[0].listingCount).toBe(2);

      // Live feed has 2 movements
      expect(data.liveFeed).toHaveLength(2);
      expect(data.liveFeed[0].sku).toMatch(/TEST-SKU/);

      // Selectable products for adjust stock modal
      expect(data.selectableProducts).toHaveLength(2);
      expect(data.warehouses).toHaveLength(2);
    });
  });

  describe("getConnectPageData", () => {
    it("returns all 6 channel types with connection detection", async () => {
      const data = await getConnectPageData(accountId);

      expect(data.channels).toHaveLength(6);

      const shopifyCard = data.channels.find((c) => c.type === "SHOPIFY");
      expect(shopifyCard).toBeDefined();
      expect(shopifyCard?.connected).toBe(true);
      expect(shopifyCard?.totalListingCount).toBe(2);
      expect(shopifyCard?.primaryStoreRef).toBe("test-shop.myshopify.com");

      const ebayCard = data.channels.find((c) => c.type === "EBAY");
      expect(ebayCard).toBeDefined();
      expect(ebayCard?.connected).toBe(false);
      expect(ebayCard?.totalListingCount).toBe(0);

      const amazonCard = data.channels.find((c) => c.type === "AMAZON");
      expect(amazonCard).toBeDefined();
      expect(amazonCard?.connected).toBe(false);
    });

    it("calculates real matching preview metrics", async () => {
      const data = await getConnectPageData(accountId);

      expect(data.matchingPreview.totalListings).toBe(2);
      expect(data.matchingPreview.matchedListings).toBe(1);
      expect(data.matchingPreview.unlinkedListings).toBe(1);
      expect(data.matchingPreview.matchedPercent).toBe(50);
      expect(data.matchingPreview.unlinkedPercent).toBe(50);
    });
  });
});
