"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAccountId } from "@/server/account";
import { prisma } from "@/server/db";
import { applyStockMovement, setStock } from "@/server/stock";
import { StockError, InsufficientStockError } from "@/server/errors";
import { MoveReason } from "@prisma/client";

export interface AdjustStockActionInput {
  productId: string;
  warehouseId: string;
  mode: "adjust" | "set";
  quantity: number;
  reason: MoveReason;
  refLabel?: string;
  note?: string;
}

export interface AdjustStockActionResult {
  ok: boolean;
  code?: string;
  message?: string;
}

const validReasons = new Set(Object.values(MoveReason));

export async function adjustStockAction(
  input: AdjustStockActionInput
): Promise<AdjustStockActionResult> {
  try {
    // 1. Resolve tenant accountId securely on the server
    const accountId = await getCurrentAccountId();

    // 2. Validate inputs
    if (
      !input.productId ||
      typeof input.productId !== "string" ||
      !input.productId.trim()
    ) {
      return {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "A valid product must be selected.",
      };
    }

    if (
      !input.warehouseId ||
      typeof input.warehouseId !== "string" ||
      !input.warehouseId.trim()
    ) {
      return {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "A valid warehouse must be selected.",
      };
    }

    if (
      typeof input.quantity !== "number" ||
      !Number.isInteger(input.quantity)
    ) {
      return {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Quantity must be an integer.",
      };
    }

    if (!validReasons.has(input.reason)) {
      return {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Invalid reason provided.",
      };
    }

    if (input.mode === "set") {
      if (input.quantity < 0) {
        return {
          ok: false,
          code: "VALIDATION_ERROR",
          message: "Target stock on hand cannot be negative.",
        };
      }

      await setStock({
        accountId,
        productId: input.productId,
        warehouseId: input.warehouseId,
        targetOnHand: input.quantity,
        reason: input.reason,
        refLabel: input.refLabel?.trim() || undefined,
        note: input.note?.trim() || undefined,
      });
    } else {
      if (input.quantity === 0) {
        return {
          ok: false,
          code: "INVALID_DELTA",
          message: "Quantity adjustment must be a non-zero whole number.",
        };
      }

      await applyStockMovement({
        accountId,
        productId: input.productId,
        warehouseId: input.warehouseId,
        delta: input.quantity,
        reason: input.reason,
        refLabel: input.refLabel?.trim() || undefined,
        note: input.note?.trim() || undefined,
      });
    }

    // 3. Revalidate paths on success
    revalidatePath("/inventory");
    revalidatePath("/");

    return { ok: true };
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      try {
        const currentLevel = await prisma.stockLevel.findUnique({
          where: {
            productId_warehouseId: {
              productId: input.productId,
              warehouseId: input.warehouseId,
            },
          },
          select: { onHand: true },
        });
        const currentOnHand = currentLevel?.onHand ?? 0;
        return {
          ok: false,
          code: "INSUFFICIENT_STOCK",
          message: `Not enough stock: only ${currentOnHand} on hand`,
        };
      } catch {
        return {
          ok: false,
          code: "INSUFFICIENT_STOCK",
          message: "Not enough stock on hand to fulfill this removal.",
        };
      }
    }

    if (error instanceof StockError) {
      return {
        ok: false,
        code: error.code,
        message: error.message,
      };
    }

    return {
      ok: false,
      code: "UNKNOWN_ERROR",
      message: "An unexpected error occurred while adjusting stock.",
    };
  }
}
