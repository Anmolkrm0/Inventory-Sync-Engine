"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAccountId } from "@/server/account";
import { updateStockSettings } from "@/server/stock";
import { StockError } from "@/server/errors";

export interface UpdateCloseAtActionInput {
  productId: string;
  warehouseId: string;
  closeAt: number;
  sku: string;
}

export interface UpdateCloseAtActionResult {
  ok: boolean;
  message?: string;
}

export async function updateCloseAtAction(
  input: UpdateCloseAtActionInput
): Promise<UpdateCloseAtActionResult> {
  try {
    const accountId = await getCurrentAccountId();

    if (
      typeof input.closeAt !== "number" ||
      !Number.isInteger(input.closeAt) ||
      input.closeAt < 0 ||
      input.closeAt > 1_000_000
    ) {
      return {
        ok: false,
        message: "Close-at must be a non-negative integer <= 1,000,000.",
      };
    }

    if (!input.productId || !input.warehouseId) {
      return {
        ok: false,
        message: "Valid product and warehouse IDs are required.",
      };
    }

    await updateStockSettings({
      accountId,
      productId: input.productId,
      warehouseId: input.warehouseId,
      closeAt: input.closeAt,
    });

    revalidatePath(`/inventory/${encodeURIComponent(input.sku)}`);
    revalidatePath("/inventory");
    revalidatePath("/");

    return { ok: true };
  } catch (error) {
    if (error instanceof StockError) {
      return {
        ok: false,
        message: error.message,
      };
    }

    console.error("updateCloseAtAction unexpected error:", error);
    return {
      ok: false,
      message: "An unexpected error occurred while updating close-at.",
    };
  }
}
