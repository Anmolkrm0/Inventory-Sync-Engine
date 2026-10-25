import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma, pool } from "@/server/db";
import {
  applyStockMovement,
  setStock,
  available,
  pushQty,
  statusFor,
  getAvailable,
} from "@/server/stock";
import { bundleAvailable } from "@/server/bundles";
import {
  InsufficientStockError,
  NotFoundError,
  BundleStockError,
  InvalidDeltaError,
} from "@/server/errors";
import { MoveReason } from "@prisma/client";

describe("Stock Engine (Real PostgreSQL Test Database)", () => {
  let accountId: string;
  let warehouse1Id: string;
  let warehouse2Id: string;

  // Clear tables and set up a fresh test account and warehouses before each test
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
      data: { accountId, name: "Main Warehouse", kind: "Own", sortOrder: 1 },
    });
    warehouse1Id = wh1.id;

    const wh2 = await prisma.warehouse.create({
      data: { accountId, name: "3PL East", kind: "3PL", sortOrder: 2 },
    });
    warehouse2Id = wh2.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

  // Helper to create a test product with initial stock
  async function createProductWithStock(params: {
    sku: string;
    name?: string;
    isBundle?: boolean;
    warehouseId?: string;
    onHand?: number;
    booked?: number;
    closeAt?: number;
    minLevel?: number;
    stocked?: boolean;
    accId?: string;
  }) {
    const acc = params.accId ?? accountId;
    const wh = params.warehouseId ?? warehouse1Id;
    const product = await prisma.product.create({
      data: {
        accountId: acc,
        sku: params.sku,
        name: params.name ?? `Product ${params.sku}`,
        isBundle: params.isBundle ?? false,
      },
    });

    if (!params.isBundle && params.onHand !== undefined) {
      await prisma.stockLevel.create({
        data: {
          productId: product.id,
          warehouseId: wh,
          onHand: params.onHand ?? 0,
          booked: params.booked ?? 0,
          closeAt: params.closeAt ?? 0,
          minLevel: params.minLevel ?? 0,
          stocked: params.stocked ?? true,
        },
      });
    }

    return product;
  }

  // 1. Oversell test: product with onHand 10. Fire 20 parallel applyStockMovement(delta -1).
  it("Oversell test: exactly 10 of 20 parallel -1 movements succeed on onHand 10 and rejections are InsufficientStockError", async () => {
    const product = await createProductWithStock({
      sku: "TEST-OVERSELL",
      onHand: 10,
    });

    // Fire 20 concurrent decrement requests
    const promises = Array.from({ length: 20 }, (_, i) =>
      applyStockMovement({
        accountId,
        productId: product.id,
        warehouseId: warehouse1Id,
        delta: -1,
        reason: MoveReason.ORDER,
        refLabel: `Order #${i + 1}`,
      })
    );

    const results = await Promise.allSettled(promises);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected"
    );

    expect(fulfilled.length).toBe(10);
    expect(rejected.length).toBe(10);

    // Assert every rejected result's reason is an InsufficientStockError
    for (const rej of rejected) {
      expect(rej.reason).toBeInstanceOf(InsufficientStockError);
      expect((rej.reason as InsufficientStockError).code).toBe("INSUFFICIENT_STOCK");
    }

    // Final onHand must be exactly 0
    const finalLevel = await prisma.stockLevel.findUniqueOrThrow({
      where: {
        productId_warehouseId: {
          productId: product.id,
          warehouseId: warehouse1Id,
        },
      },
    });
    expect(finalLevel.onHand).toBe(0);

    // Exactly 10 movement rows recorded
    const movementCount = await prisma.stockMovement.count({
      where: { productId: product.id },
    });
    expect(movementCount).toBe(10);
  });

  // 2. 20 parallel +1 movements on onHand 0: final onHand 20, 20 movement rows
  it("20 parallel +1 movements on onHand 0 results in onHand 20 and 20 movements", async () => {
    const product = await createProductWithStock({
      sku: "TEST-INCREMENT",
      onHand: 0,
    });

    const promises = Array.from({ length: 20 }, (_, i) =>
      applyStockMovement({
        accountId,
        productId: product.id,
        warehouseId: warehouse1Id,
        delta: 1,
        reason: MoveReason.PO_RECEIVE,
        refLabel: `PO #${i + 1}`,
      })
    );

    const results = await Promise.allSettled(promises);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    expect(fulfilled.length).toBe(20);

    const finalLevel = await prisma.stockLevel.findUniqueOrThrow({
      where: {
        productId_warehouseId: {
          productId: product.id,
          warehouseId: warehouse1Id,
        },
      },
    });
    expect(finalLevel.onHand).toBe(20);

    const movementCount = await prisma.stockMovement.count({
      where: { productId: product.id },
    });
    expect(movementCount).toBe(20);
  });

  // 3. Movement that would go negative is rejected and writes no StockMovement
  it("Movement that would go negative is rejected with InsufficientStockError and writes no StockMovement", async () => {
    const product = await createProductWithStock({
      sku: "TEST-NEGATIVE",
      onHand: 5,
    });

    await expect(
      applyStockMovement({
        accountId,
        productId: product.id,
        warehouseId: warehouse1Id,
        delta: -6,
        reason: MoveReason.ORDER,
        refLabel: "Order #999",
      })
    ).rejects.toThrow(InsufficientStockError);

    const level = await prisma.stockLevel.findUniqueOrThrow({
      where: {
        productId_warehouseId: {
          productId: product.id,
          warehouseId: warehouse1Id,
        },
      },
    });
    expect(level.onHand).toBe(5);

    const movementCount = await prisma.stockMovement.count({
      where: { productId: product.id },
    });
    expect(movementCount).toBe(0);
  });

  // 4. setStock racing with 5 parallel -1 movements ends with a consistent onHand (between 35 and 40) and movement log
  it("setStock racing with 5 parallel -1 movements maintains consistent audit log with final onHand in [35, 40]", async () => {
    const initialOnHand = 50;
    const product = await createProductWithStock({
      sku: "TEST-STOCKTAKE-RACE",
      onHand: initialOnHand,
    });

    // Concurrently trigger setStock to 40 and 5 decrements of -1
    const operations = [
      setStock({
        accountId,
        productId: product.id,
        warehouseId: warehouse1Id,
        targetOnHand: 40,
        refLabel: "Stocktake by Auditor",
      }),
      ...Array.from({ length: 5 }, (_, i) =>
        applyStockMovement({
          accountId,
          productId: product.id,
          warehouseId: warehouse1Id,
          delta: -1,
          reason: MoveReason.ORDER,
          refLabel: `Race Order #${i + 1}`,
        })
      ),
    ];

    const results = await Promise.allSettled(operations);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    expect(fulfilled.length).toBe(6);

    const finalLevel = await prisma.stockLevel.findUniqueOrThrow({
      where: {
        productId_warehouseId: {
          productId: product.id,
          warehouseId: warehouse1Id,
        },
      },
    });

    // Final onHand must be between 35 and 40 inclusive
    expect(finalLevel.onHand).toBeGreaterThanOrEqual(35);
    expect(finalLevel.onHand).toBeLessThanOrEqual(40);

    const movements = await prisma.stockMovement.findMany({
      where: { productId: product.id },
    });

    // Sum of deltas must equal final onHand minus starting onHand
    const sumOfDeltas = movements.reduce((acc, m) => acc + m.delta, 0);
    expect(sumOfDeltas).toBe(finalLevel.onHand - initialOnHand);

    // If setStock is called with target equal to current onHand, it records 0 movements
    const currentOnHand = finalLevel.onHand;
    const noopResult = await setStock({
      accountId,
      productId: product.id,
      warehouseId: warehouse1Id,
      targetOnHand: currentOnHand,
    });
    expect(noopResult.onHand).toBe(currentOnHand);

    const movementsAfterNoop = await prisma.stockMovement.count({
      where: { productId: product.id },
    });
    expect(movementsAfterNoop).toBe(movements.length);
  });

  // 5. Movement on a bundle product is rejected; movement with another account's productId is rejected
  it("Rejects movements on bundle products (BundleStockError) and cross-account access (NotFoundError)", async () => {
    // 5a. Bundle product rejection
    const bundleProduct = await createProductWithStock({
      sku: "BND-TEST",
      isBundle: true,
    });

    await expect(
      applyStockMovement({
        accountId,
        productId: bundleProduct.id,
        warehouseId: warehouse1Id,
        delta: 1,
        reason: MoveReason.PO_RECEIVE,
      })
    ).rejects.toThrow(BundleStockError);

    // 5b. Cross-account rejection
    const foreignAccount = await prisma.account.create({
      data: { name: "Foreign Corp" },
    });
    const foreignWarehouse = await prisma.warehouse.create({
      data: {
        accountId: foreignAccount.id,
        name: "Foreign Wh",
        kind: "Own",
        sortOrder: 1,
      },
    });
    const foreignProduct = await createProductWithStock({
      sku: "FOR-SKU",
      accId: foreignAccount.id,
      warehouseId: foreignWarehouse.id,
      onHand: 10,
    });

    await expect(
      applyStockMovement({
        accountId, // Calling with our account
        productId: foreignProduct.id, // But foreign product
        warehouseId: warehouse1Id,
        delta: 1,
        reason: MoveReason.PO_RECEIVE,
      })
    ).rejects.toThrow(NotFoundError);

    // 5c. Delta must be non-zero integer
    const normalProduct = await createProductWithStock({
      sku: "TEST-DELTA-ZERO",
      onHand: 10,
    });
    await expect(
      applyStockMovement({
        accountId,
        productId: normalProduct.id,
        warehouseId: warehouse1Id,
        delta: 0,
        reason: MoveReason.MANUAL,
      })
    ).rejects.toThrow(InvalidDeltaError);
  });

  // 6. statusFor covers all four statuses, including the Stoneware Plate case and negative available
  it("statusFor covers all four statuses (Sold out, Held at 0, Low stock, Healthy) and clamps negative available", async () => {
    // Sold out: available <= 0 (including negative onHand - booked)
    expect(
      statusFor({ onHand: 5, booked: 5, closeAt: 0, minLevel: 2 })
    ).toBe("Sold out");
    expect(
      statusFor({ onHand: 1, booked: 3, closeAt: 0, minLevel: 2 })
    ).toBe("Sold out");

    // Held at 0: available > 0 && available <= closeAt (The Stoneware Plate case: available 5, closeAt 5)
    expect(
      statusFor({ onHand: 10, booked: 5, closeAt: 5, minLevel: 2 })
    ).toBe("Held at 0");
    expect(
      statusFor({ onHand: 8, booked: 5, closeAt: 5, minLevel: 2 })
    ).toBe("Held at 0");

    // Low stock: available <= minLevel (and not held at 0)
    expect(
      statusFor({ onHand: 7, booked: 3, closeAt: 0, minLevel: 5 })
    ).toBe("Low stock"); // available = 4 <= 5

    // Healthy: available > minLevel && available > closeAt
    expect(
      statusFor({ onHand: 25, booked: 5, closeAt: 2, minLevel: 10 })
    ).toBe("Healthy"); // available = 20 > 10

    // pushQty helper check:
    expect(pushQty({ onHand: 10, booked: 5, closeAt: 5 })).toBe(0); // 5 <= 5 -> 0
    expect(pushQty({ onHand: 12, booked: 5, closeAt: 5 })).toBe(7); // 7 > 5 -> 7
    expect(available({ onHand: 12, booked: 5 })).toBe(7);

    // Negative available clamp: onHand 1, booked 3 in warehouse A plus onHand 5, booked 0 in warehouse B
    const levelA = { onHand: 1, booked: 3, closeAt: 0, minLevel: 2 };
    expect(available(levelA)).toBe(0);
    expect(pushQty(levelA)).toBe(0);
    expect(statusFor(levelA)).toBe("Sold out");

    const productMulti = await createProductWithStock({
      sku: "TEST-MULTI-WH-CLAMP",
      warehouseId: warehouse1Id,
      onHand: 1,
      booked: 3, // avail = Math.max(0, 1-3) = 0
      stocked: true,
    });
    await prisma.stockLevel.create({
      data: {
        productId: productMulti.id,
        warehouseId: warehouse2Id,
        onHand: 5,
        booked: 0, // avail = 5
        stocked: true,
      },
    });

    const multiAvail = await getAvailable(accountId, productMulti.id);
    expect(multiAvail).toBe(5);
  });

  // 7. bundleAvailable: BND-MORNING limited by CER-MUG-COB; a component at closeAt makes its sets 0 in that warehouse
  it("bundleAvailable computes per-warehouse sets, limiting component, and honors closeAt and accountId scoping", async () => {
    // Create components
    const mug = await createProductWithStock({
      sku: "CER-MUG-COB",
      warehouseId: warehouse1Id,
      onHand: 12,
      booked: 3,
      closeAt: 2, // available = 9 > 2 -> pushQty = 9 in Main
    });
    // Add mug to 3PL warehouse
    await prisma.stockLevel.create({
      data: {
        productId: mug.id,
        warehouseId: warehouse2Id,
        onHand: 4,
        booked: 1,
        closeAt: 0, // available = 3 -> pushQty = 3 in 3PL
        stocked: true,
      },
    });

    const tea = await createProductWithStock({
      sku: "TEA-SNC-100",
      warehouseId: warehouse1Id,
      onHand: 62,
      booked: 6,
      closeAt: 0, // available = 56 in Main
    });
    await prisma.stockLevel.create({
      data: {
        productId: tea.id,
        warehouseId: warehouse2Id,
        onHand: 15,
        booked: 0,
        closeAt: 0, // available = 15 in 3PL
        stocked: true,
      },
    });

    const coaster = await createProductWithStock({
      sku: "CST-CDR-04",
      warehouseId: warehouse1Id,
      onHand: 34,
      booked: 2,
      closeAt: 0, // available = 32 in Main
    });
    await prisma.stockLevel.create({
      data: {
        productId: coaster.id,
        warehouseId: warehouse2Id,
        onHand: 8,
        booked: 0,
        closeAt: 0, // available = 8 in 3PL
        stocked: true,
      },
    });

    // Create bundle BND-MORNING (1 mug + 1 tea + 1 coaster)
    const bundle = await prisma.product.create({
      data: {
        accountId,
        sku: "BND-MORNING",
        name: "Morning Ritual Set",
        isBundle: true,
      },
    });

    await prisma.bundleComponent.createMany({
      data: [
        { bundleId: bundle.id, componentId: mug.id, qty: 1 },
        { bundleId: bundle.id, componentId: tea.id, qty: 1 },
        { bundleId: bundle.id, componentId: coaster.id, qty: 1 },
      ],
    });

    // Initial check:
    // Main Wh: mug=9, tea=56, coaster=32 -> sets = min(9, 56, 32) = 9
    // 3PL Wh: mug=3, tea=15, coaster=8 -> sets = min(3, 15, 8) = 3
    // Total bundle available = 9 + 3 = 12
    // Limiting component: mug (12)
    const result1 = await bundleAvailable(accountId, bundle.id);
    expect(result1.available).toBe(12);
    expect(result1.limitingComponentId).toBe(mug.id);

    const mugComponent = result1.perComponent.find(
      (c) => c.componentId === mug.id
    );
    expect(mugComponent?.sets).toBe(12);

    // Cross-account test for bundleAvailable: query with a foreign accountId returns 0
    const foreignAccount = await prisma.account.create({
      data: { name: "Another Account" },
    });
    const crossAccountResult = await bundleAvailable(
      foreignAccount.id,
      bundle.id
    );
    expect(crossAccountResult.available).toBe(0);
    expect(crossAccountResult.limitingComponentId).toBeNull();
    expect(crossAccountResult.perComponent.length).toBe(0);

    // Test closeAt condition:
    // Set Mug closeAt in Main Warehouse to 10.
    // available (9) <= closeAt (10) -> pushQty in Main becomes 0!
    await prisma.stockLevel.update({
      where: {
        productId_warehouseId: {
          productId: mug.id,
          warehouseId: warehouse1Id,
        },
      },
      data: {
        closeAt: 10,
      },
    });

    const result2 = await bundleAvailable(accountId, bundle.id);
    // Main Wh sets = min(0, 56, 32) = 0
    // 3PL Wh sets = min(3, 15, 8) = 3
    // Total bundle available = 0 + 3 = 3
    expect(result2.available).toBe(3);
    expect(result2.limitingComponentId).toBe(mug.id);

    const mugComponentAfter = result2.perComponent.find(
      (c) => c.componentId === mug.id
    );
    expect(mugComponentAfter?.sets).toBe(3); // only 3PL allows 3 sets now
  });

  // 8. getAvailable helper: sums available over stocked warehouses only and scopes by accountId
  it("getAvailable sums available (onHand - booked) over stocked warehouses only and scopes by accountId", async () => {
    const product = await createProductWithStock({
      sku: "TEST-GET-AVAIL",
      warehouseId: warehouse1Id,
      onHand: 20,
      booked: 5, // avail = 15
      stocked: true,
    });

    await prisma.stockLevel.create({
      data: {
        productId: product.id,
        warehouseId: warehouse2Id,
        onHand: 10,
        booked: 2, // avail = 8
        stocked: true,
      },
    });

    const unstockedWh = await prisma.warehouse.create({
      data: { accountId, name: "Unstocked Wh", kind: "Store", sortOrder: 3 },
    });
    await prisma.stockLevel.create({
      data: {
        productId: product.id,
        warehouseId: unstockedWh.id,
        onHand: 50,
        booked: 0,
        stocked: false, // NOT stocked
      },
    });

    const totalAvailable = await getAvailable(accountId, product.id);
    // 15 + 8 = 23 (unstocked warehouse excluded)
    expect(totalAvailable).toBe(23);

    // Foreign account gets 0
    const foreignAccount = await prisma.account.create({
      data: { name: "Foreign Org" },
    });
    const foreignAvail = await getAvailable(foreignAccount.id, product.id);
    expect(foreignAvail).toBe(0);
  });
});
