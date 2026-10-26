"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAccountId } from "@/server/account";
import { updateStockSettings } from "@/server/stock";
import {
  NotFoundError,
  InvalidSettingError,
  toUserMessage,
} from "@/server/errors";

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
      throw new InvalidSettingError(
        "Close-at must be a non-negative integer <= 1,000,000."
      );
    }

    if (!input.productId || !input.warehouseId) {
      throw new NotFoundError("Valid product and warehouse IDs are required.");
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
    console.error("updateCloseAtAction error:", error);
    return {
      ok: false,
      message: toUserMessage(error),
    };
  }
}
