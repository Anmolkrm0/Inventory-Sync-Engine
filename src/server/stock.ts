import { MoveReason, type StockLevel } from "@prisma/client";
import { prisma } from "@/server/db";
import {
  InsufficientStockError,
  NotFoundError,
  BundleStockError,
  InvalidDeltaError,
  InvalidSettingError,
} from "@/server/errors";

export type StockStatus = "Healthy" | "Low stock" | "Sold out" | "Held at 0";

export interface StockLevelData {
  productId: string;
  warehouseId: string;
  onHand: number;
  booked: number;
  incoming: number;
  closeAt: number;
  minLevel: number;
  stocked: boolean;
}

export interface ApplyStockMovementInput {
  accountId: string;
  productId: string;
  warehouseId: string;
  delta: number;
  reason: MoveReason;
  refLabel?: string;
  note?: string;
  userId?: string;
}

export interface SetStockInput {
  accountId: string;
  productId: string;
  warehouseId: string;
  targetOnHand: number;
  reason?: MoveReason;
  refLabel?: string;
  note?: string;
  userId?: string;
}

/**
 * Available is always computed as Math.max(0, onHand - booked) (never stored separately).
 */
export function available(level: { onHand: number; booked: number }): number {
  return Math.max(0, level.onHand - level.booked);
}

/**
 * pushQty is what connected channels receive:
 * If available <= closeAt, stock is held at 0. Otherwise it pushes available.
 */
export function pushQty(level: {
  onHand: number;
  booked: number;
  closeAt: number;
}): number {
  const avail = available(level);
  return avail <= level.closeAt ? 0 : avail;
}

/**
 * Status mapping based on available stock:
 * - available <= 0 → "Sold out"
 * - available > 0 && available <= closeAt → "Held at 0"
 * - available <= minLevel → "Low stock"
 * - else "Healthy"
 */
export function statusFor(level: {
  onHand: number;
  booked: number;
  closeAt: number;
  minLevel: number;
}): StockStatus {
  const avail = available(level);
  if (avail <= 0) return "Sold out";
  if (avail > 0 && avail <= level.closeAt) return "Held at 0";
  if (avail <= level.minLevel) return "Low stock";
  return "Healthy";
}

/**
 * Aggregate status across multiple stocked warehouses:
 * - totalAvailable = sum available
 * - totalPush = sum pushQty
 * - totalMin = sum minLevel
 * - Sold out if totalAvailable == 0
 * - Held at 0 if totalAvailable > 0 && totalPush == 0
 * - Low stock if totalAvailable <= totalMin
 * - else Healthy
 */
export function statusForLevels(
  levels: Array<{
    onHand: number;
    booked: number;
    closeAt: number;
    minLevel: number;
    stocked?: boolean;
  }>
): StockStatus {
  const stockedLevels = levels.filter((l) => l.stocked !== false);
  if (stockedLevels.length === 0) {
    return "Sold out";
  }

  let totalAvailable = 0;
  let totalPush = 0;
  let totalMin = 0;

  for (const lvl of stockedLevels) {
    const avail = available(lvl);
    totalAvailable += avail;
    totalPush += pushQty(lvl);
    totalMin += lvl.minLevel;
  }

  if (totalAvailable === 0) return "Sold out";
  if (totalAvailable > 0 && totalPush === 0) return "Held at 0";
  if (totalAvailable <= totalMin) return "Low stock";
  return "Healthy";
}

/**
 * Sum of available (Math.max(0, onHand - booked)) over stocked warehouses only.
 * Filters by accountId. Does NOT subtract closeAt.
 */
export async function getAvailable(
  accountId: string,
  productId: string
): Promise<number> {
  const levels = await prisma.stockLevel.findMany({
    where: {
      productId,
      stocked: true,
      warehouse: {
        accountId,
      },
    },
    select: {
      onHand: true,
      booked: true,
    },
  });

  return levels.reduce((acc, lvl) => acc + available(lvl), 0);
}

/**
 * Internal transaction helper for locked stock modifications.
 * Locks the row with SELECT ... FOR UPDATE before computing/applying the delta.
 */
async function lockAndAdjustStock(
  accountId: string,
  productId: string,
  warehouseId: string,
  computeDelta: (currentOnHand: number) => number,
  reason: MoveReason,
  refLabel?: string,
  note?: string,
  userId?: string
): Promise<StockLevel> {
  return await prisma.$transaction(async (tx) => {
    // 1. Verify product belongs to accountId
    const product = await tx.product.findFirst({
      where: { id: productId, accountId },
      select: { id: true, isBundle: true },
    });
    if (!product) {
      throw new NotFoundError(
        `Product ${productId} not found for account ${accountId}`
      );
    }
    if (product.isBundle) {
      throw new BundleStockError(
        `Product ${productId} is a bundle and cannot hold stock directly`
      );
    }

    // 2. Verify warehouse belongs to accountId
    const warehouse = await tx.warehouse.findFirst({
      where: { id: warehouseId, accountId },
      select: { id: true },
    });
    if (!warehouse) {
      throw new NotFoundError(
        `Warehouse ${warehouseId} not found for account ${accountId}`
      );
    }

    // 3. Ensure the StockLevel row exists: INSERT ... ON CONFLICT DO NOTHING
    await tx.$executeRaw`
      INSERT INTO "StockLevel" ("productId", "warehouseId", "onHand", "booked", "incoming", "closeAt", "minLevel", "stocked")
      VALUES (${productId}, ${warehouseId}, 0, 0, 0, 0, 0, true)
      ON CONFLICT ("productId", "warehouseId") DO NOTHING
    `;

    // 4. Lock row with SELECT ... FOR UPDATE
    const lockedRows = await tx.$queryRaw<StockLevel[]>`
      SELECT "productId", "warehouseId", "onHand", "booked", "incoming", "closeAt", "minLevel", "stocked"
      FROM "StockLevel"
      WHERE "productId" = ${productId} AND "warehouseId" = ${warehouseId}
      FOR UPDATE
    `;

    if (!lockedRows || lockedRows.length === 0) {
      throw new NotFoundError(
        `Failed to lock StockLevel for product ${productId} in warehouse ${warehouseId}`
      );
    }

    const currentLevel = lockedRows[0];
    const delta = computeDelta(currentLevel.onHand);

    // If delta is 0 (e.g. setStock to existing onHand), record nothing and return
    if (delta === 0) {
      return currentLevel;
    }

    const newOnHand = currentLevel.onHand + delta;
    if (newOnHand < 0) {
      throw new InsufficientStockError(
        currentLevel.onHand,
        Math.abs(delta)
      );
    }

    // 5. Update StockLevel
    const updatedLevel = await tx.stockLevel.update({
      where: {
        productId_warehouseId: { productId, warehouseId },
      },
      data: {
        onHand: newOnHand,
      },
    });

    // 6. Insert StockMovement audit log
    await tx.stockMovement.create({
      data: {
        productId,
        warehouseId,
        delta,
        reason,
        refLabel,
        note,
        userId,
      },
    });

    return updatedLevel;
  });
}

/**
 * Apply a stock change with pessimistic locking.
 * delta must be a non-zero integer.
 */
export async function applyStockMovement(
  input: ApplyStockMovementInput
): Promise<StockLevel> {
  const {
    accountId,
    productId,
    warehouseId,
    delta,
    reason,
    refLabel,
    note,
    userId,
  } = input;

  if (!Number.isInteger(delta) || delta === 0) {
    throw new InvalidDeltaError(
      `delta must be a non-zero integer, received: ${delta}`
    );
  }

  return lockAndAdjustStock(
    accountId,
    productId,
    warehouseId,
    () => delta,
    reason,
    refLabel,
    note,
    userId
  );
}

/**
 * Stocktake helper: sets onHand to targetOnHand.
 * Delta is computed AFTER acquiring the row lock inside the transaction.
 * If targetOnHand == onHand, no movement is recorded and the level is returned.
 */
export async function setStock(input: SetStockInput): Promise<StockLevel> {
  const {
    accountId,
    productId,
    warehouseId,
    targetOnHand,
    reason = MoveReason.STOCKTAKE,
    refLabel,
    note,
    userId,
  } = input;

  if (!Number.isInteger(targetOnHand) || targetOnHand < 0) {
    throw new InvalidDeltaError(
      `targetOnHand must be a non-negative integer, received: ${targetOnHand}`
    );
  }

  return lockAndAdjustStock(
    accountId,
    productId,
    warehouseId,
    (currentOnHand) => targetOnHand - currentOnHand,
    reason,
    refLabel,
    note,
    userId
  );
}

export interface UpdateStockSettingsInput {
  accountId: string;
  productId: string;
  warehouseId: string;
  closeAt?: number;
  minLevel?: number;
}

/**
 * Updates stock settings (closeAt, minLevel) for a product in a warehouse.
 * Validates integers >= 0, scoped to account, and never modifies onHand.
 */
export async function updateStockSettings(
  input: UpdateStockSettingsInput
): Promise<StockLevel> {
  const { accountId, productId, warehouseId, closeAt, minLevel } = input;

  if (closeAt !== undefined) {
    if (!Number.isInteger(closeAt) || closeAt < 0 || closeAt > 1_000_000) {
      throw new InvalidSettingError(
        `Close-at must be a non-negative integer <= 1,000,000, received: ${closeAt}`
      );
    }
  }

  if (minLevel !== undefined) {
    if (!Number.isInteger(minLevel) || minLevel < 0 || minLevel > 1_000_000) {
      throw new InvalidSettingError(
        `Min level must be a non-negative integer <= 1,000,000, received: ${minLevel}`
      );
    }
  }

  // Verify product and warehouse belong to accountId
  const [product, warehouse] = await Promise.all([
    prisma.product.findFirst({
      where: { id: productId, accountId },
      select: { id: true, isBundle: true },
    }),
    prisma.warehouse.findFirst({
      where: { id: warehouseId, accountId },
      select: { id: true },
    }),
  ]);

  if (!product || !warehouse) {
    throw new NotFoundError(
      `Product ${productId} or Warehouse ${warehouseId} not found for account ${accountId}`
    );
  }

  if (product.isBundle) {
    throw new BundleStockError(
      "Bundle products cannot have warehouse stock settings directly"
    );
  }

  return await prisma.$transaction(async (tx) => {
    // Ensure the row exists
    await tx.$executeRaw`
      INSERT INTO "StockLevel" ("productId", "warehouseId", "onHand", "booked", "incoming", "closeAt", "minLevel", "stocked")
      VALUES (${productId}, ${warehouseId}, 0, 0, 0, 0, 0, true)
      ON CONFLICT ("productId", "warehouseId") DO NOTHING
    `;

    const dataToUpdate: { closeAt?: number; minLevel?: number } = {};
    if (closeAt !== undefined) dataToUpdate.closeAt = closeAt;
    if (minLevel !== undefined) dataToUpdate.minLevel = minLevel;

    return await tx.stockLevel.update({
      where: {
        productId_warehouseId: { productId, warehouseId },
      },
      data: dataToUpdate,
    });
  });
}

