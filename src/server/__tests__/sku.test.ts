import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { prisma, pool } from "@/server/db";
import { getSkuDetail } from "@/server/sku";
import { updateCloseAtAction } from "@/app/(app)/inventory/[sku]/actions";
import { resetCachedAccountId } from "@/server/account";
import { ChannelType, MoveReason } from "@prisma/client";
import {
  toUserMessage,
  NotFoundError,
  BundleStockError,
  InsufficientStockError,
  InvalidDeltaError,
  InvalidSettingError,
} from "@/server/errors";

// Mock next/navigation for notFound and redirect
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    const err = new Error("NEXT_NOT_FOUND");
    (err as unknown as { digest: string }).digest = "NEXT_NOT_FOUND";
    throw err;
  }),
  redirect: vi.fn((url: string) => {
    const err = new Error("NEXT_REDIRECT: " + url);
    (err as unknown as { digest: string }).digest = "NEXT_REDIRECT";
    throw err;
  }),
}));

// Mock next/cache revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("SKU Detail Server Layer & Actions (Real PostgreSQL)", () => {
  let accountId: string;
  let warehouse1Id: string;
  let warehouse2Id: string;
  let channel1Id: string;
  let channel2Id: string;
  let productId: string;
  const testSku = "CER-MUG-COB";

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
      data: { name: "Acme Goods Co." },
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

    const c1 = await prisma.channel.create({
      data: {
        accountId,
        name: "Shopify US",
        type: ChannelType.SHOPIFY,
        storeRef: "acme-goods.myshopify.com",
      },
    });
    channel1Id = c1.id;

    const c2 = await prisma.channel.create({
      data: {
        accountId,
        name: "Etsy",
        type: ChannelType.ETSY,
        storeRef: "etsy.com/shop/acme-goods",
      },
    });
    channel2Id = c2.id;

    const product = await prisma.product.create({
      data: {
        accountId,
        sku: testSku,
        name: "Ceramic Mug — Cobalt",
        barcode: "84729104",
        category: "Tableware",
        swatch: "#3155F5",
        costCents: 650,
        stockLevels: {
          create: [
            {
              warehouseId: warehouse1Id,
              onHand: 12,
              booked: 3,
              incoming: 5,
              closeAt: 2,
              minLevel: 10,
              stocked: true,
            },
            {
              warehouseId: warehouse2Id,
              onHand: 4,
              booked: 1,
              incoming: 0,
              closeAt: 0,
              minLevel: 2,
              stocked: true,
            },
          ],
        },
        listings: {
          create: [
            {
              channelId: channel1Id,
              externalId: "sh-101",
              title: "Ceramic Mug Cobalt on Shopify",
              isPrimary: true,
              lastPushedQty: 9,
              channelQty: 9, // In sync
              lastPushedAt: new Date(Date.now() - 10 * 60 * 1000),
            },
            {
              channelId: channel2Id,
              externalId: "et-202",
              title: "Handmade Ceramic Mug Cobalt on Etsy",
              isPrimary: false,
              lastPushedQty: 12,
              channelQty: 15, // Discrepancy! Changed outside app
              lastPushedAt: new Date(Date.now() - 60 * 60 * 1000),
            },
          ],
        },
      },
    });
    productId = product.id;

    // Add sample stock movements over the last 30 days
    await prisma.stockMovement.createMany({
      data: [
        {
          productId,
          warehouseId: warehouse1Id,
          delta: -3,
          reason: MoveReason.ORDER,
          refLabel: "Order #4821 · Shopify US",
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        },
        {
          productId,
          warehouseId: warehouse1Id,
          delta: 10,
          reason: MoveReason.PO_RECEIVE,
          refLabel: "PO #1042 · Restock",
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

  it("getSkuDetail returns comprehensive product stats, warehouses, and listings", async () => {
    const detail = await getSkuDetail(accountId, testSku);

    // Product info
    expect(detail.product.sku).toBe(testSku);
    expect(detail.product.name).toBe("Ceramic Mug — Cobalt");
    expect(detail.product.barcode).toBe("84729104");

    // Aggregate stats: Wh1 (onHand 12, booked 3) + Wh2 (onHand 4, booked 1)
    // Total onHand: 16, Total booked: 4, Total available: 9 + 3 = 12
    // Total incoming: 5 + 0 = 5
    expect(detail.stats.inStock).toBe(16);
    expect(detail.stats.booked).toBe(4);
    expect(detail.stats.available).toBe(12);
    expect(detail.stats.incoming).toBe(5);

    // Warehouses
    expect(detail.warehouses.length).toBe(2);
    const wh1 = detail.warehouses.find((w) => w.warehouseId === warehouse1Id);
    expect(wh1?.available).toBe(9);
    expect(wh1?.closeAt).toBe(2);

    // Listings: primary listing first, and discrepancy detection
    expect(detail.listings.length).toBe(2);
    expect(detail.listings[0].isPrimary).toBe(true);
    expect(detail.listings[0].changedOutsideApp).toBe(false);

    const etsyListing = detail.listings.find((l) => l.channel.name === "Etsy");
    expect(etsyListing?.changedOutsideApp).toBe(true); // channelQty 15 !== lastPushedQty 12
  });

  it("getSkuDetail builds 30-day trend points and computes days of stock runway", async () => {
    const detail = await getSkuDetail(accountId, testSku);

    expect(detail.trend.length).toBe(30);
    expect(detail.trend[29].available).toBe(12); // Today's available

    // Order delta was -3 over 30 days -> avgDaily = 3/30 = 0.1 -> daysOfStockLeft = 12 / 0.1 = 120
    expect(detail.stats.daysOfStockLeft).toBe(120);

    // Activities
    expect(detail.activities.length).toBe(2);
    expect(detail.activities[0].delta).toBe(-3);
    expect(detail.activities[0].reason).toBe(MoveReason.ORDER);
  });

  it("getSkuDetail redirects to /bundles when SKU is a bundle", async () => {
    await prisma.product.create({
      data: {
        accountId,
        sku: "BUNDLE-SET",
        name: "Morning Brew Set",
        isBundle: true,
      },
    });

    await expect(getSkuDetail(accountId, "BUNDLE-SET")).rejects.toThrow(
      "NEXT_REDIRECT: /bundles?selected=BUNDLE-SET"
    );
  });

  it("getSkuDetail throws notFound when product does not exist", async () => {
    await expect(getSkuDetail(accountId, "NON-EXISTENT")).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
  });

  it("updateCloseAtAction updates warehouse closeAt and revalidates cache", async () => {
    const res = await updateCloseAtAction({
      productId,
      warehouseId: warehouse1Id,
      closeAt: 5,
      sku: testSku,
    });

    expect(res.ok).toBe(true);

    const level = await prisma.stockLevel.findUniqueOrThrow({
      where: {
        productId_warehouseId: {
          productId,
          warehouseId: warehouse1Id,
        },
      },
    });
    expect(level.closeAt).toBe(5);
    expect(level.onHand).toBe(12); // onHand untouched
  });

  it("updateCloseAtAction rejects negative closeAt values", async () => {
    const res = await updateCloseAtAction({
      productId,
      warehouseId: warehouse1Id,
      closeAt: -1,
      sku: testSku,
    });

    expect(res.ok).toBe(false);
    expect(res.message).toBe("Close-at must be a non-negative integer <= 1,000,000.");
  });

  it("trend and days-of-stock only use StockMovements from stocked warehouses", async () => {
    // Create an unstocked warehouse
    const unstockedWh = await prisma.warehouse.create({
      data: {
        accountId,
        name: "Retail Shop",
        kind: "Store",
        sortOrder: 3,
      },
    });

    await prisma.stockLevel.create({
      data: {
        productId,
        warehouseId: unstockedWh.id,
        onHand: 50,
        booked: 0,
        stocked: false, // NOT STOCKED!
      },
    });

    // Add a massive ORDER movement in the unstocked warehouse
    await prisma.stockMovement.create({
      data: {
        productId,
        warehouseId: unstockedWh.id,
        delta: -90,
        reason: MoveReason.ORDER,
        refLabel: "Store in-person sales",
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    });

    const detail = await getSkuDetail(accountId, testSku);

    // Stock runway should still be computed ONLY from stocked warehouses (delta = -3 over 30d, avg = 0.1 -> 120d)
    // If it included the unstocked warehouse (-90), avg would be (3+90)/30 = 3.1 -> 12 / 3.1 = 4 days
    expect(detail.stats.daysOfStockLeft).toBe(120);

    // Today's trend available is still 12
    expect(detail.trend[29].available).toBe(12);
  });

  describe("toUserMessage()", () => {
    it("maps NOT_FOUND to friendly message without ids", () => {
      const err = new NotFoundError("Product cl123456 not found for account acc789");
      expect(toUserMessage(err)).toBe("That product or warehouse no longer exists.");
    });

    it("maps BUNDLE_STOCK_ERROR to friendly message", () => {
      const err = new BundleStockError();
      expect(toUserMessage(err)).toBe("Bundles don't hold stock; adjust their components.");
    });

    it("maps INSUFFICIENT_STOCK to friendly message carrying onHand", () => {
      const err = new InsufficientStockError(3, 10);
      expect(toUserMessage(err)).toBe("Not enough stock: only 3 on hand");
    });

    it("maps INVALID_DELTA and INVALID_SETTING to validation text without ids", () => {
      const deltaErr = new InvalidDeltaError("Quantity must be an integer between -1,000,000 and 1,000,000.");
      expect(toUserMessage(deltaErr)).toBe("Quantity must be an integer between -1,000,000 and 1,000,000.");

      const settingErr = new InvalidSettingError("Close-at must be a non-negative integer <= 1,000,000.");
      expect(toUserMessage(settingErr)).toBe("Close-at must be a non-negative integer <= 1,000,000.");
    });

    it("maps unknown error to safe fallback message", () => {
      const err = new Error("Database timeout on connection pool");
      expect(toUserMessage(err)).toBe("An unexpected error occurred. Please try again.");
    });
  });
});
