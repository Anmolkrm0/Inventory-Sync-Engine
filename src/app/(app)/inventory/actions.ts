"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAccountId } from "@/server/account";
import { applyStockMovement, setStock } from "@/server/stock";
import {
  StockError,
  NotFoundError,
  InvalidDeltaError,
  toUserMessage,
} from "@/server/errors";
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
      throw new NotFoundError("A valid product must be selected.");
    }

    if (
      !input.warehouseId ||
      typeof input.warehouseId !== "string" ||
      !input.warehouseId.trim()
    ) {
      throw new NotFoundError("A valid warehouse must be selected.");
    }

    if (input.mode !== "adjust" && input.mode !== "set") {
      throw new InvalidDeltaError("Mode must be 'adjust' or 'set'.");
    }

    if (
      typeof input.quantity !== "number" ||
      !Number.isInteger(input.quantity) ||
      Math.abs(input.quantity) > 1_000_000
    ) {
      throw new InvalidDeltaError(
        "Quantity must be an integer between -1,000,000 and 1,000,000."
      );
    }

    if (!validReasons.has(input.reason)) {
      throw new InvalidDeltaError("Invalid reason provided.");
    }

    if (input.mode === "set") {
      if (input.quantity < 0) {
        throw new InvalidDeltaError("Target stock on hand cannot be negative.");
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
        throw new InvalidDeltaError(
          "Quantity adjustment must be a non-zero whole number."
        );
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
    console.error("adjustStockAction error:", error);
    return {
      ok: false,
      code: error instanceof StockError ? error.code : "UNKNOWN_ERROR",
      message: toUserMessage(error),
    };
  }
}
