export class StockError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "StockError";
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InsufficientStockError extends StockError {
  onHand: number;
  requested: number;

  constructor(
    onHand = 0,
    requested = 0,
    message = `Insufficient stock: only ${onHand} on hand, requested ${requested}`
  ) {
    super(message, "INSUFFICIENT_STOCK");
    this.name = "InsufficientStockError";
    this.onHand = onHand;
    this.requested = requested;
  }
}

export class NotFoundError extends StockError {
  constructor(message = "Resource not found") {
    super(message, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class BundleStockError extends StockError {
  constructor(message = "Bundle products cannot hold stock directly") {
    super(message, "BUNDLE_STOCK_ERROR");
    this.name = "BundleStockError";
  }
}

export class InvalidDeltaError extends StockError {
  constructor(message = "delta must be a non-zero integer") {
    super(message, "INVALID_DELTA");
    this.name = "InvalidDeltaError";
  }
}

export class InvalidSettingError extends StockError {
  constructor(message = "Setting value is invalid") {
    super(message, "INVALID_SETTING");
    this.name = "InvalidSettingError";
  }
}

/**
 * Maps error to friendly, user-facing text without internal IDs or technical stack traces.
 */
export function toUserMessage(error: unknown): string {
  if (error instanceof InsufficientStockError) {
    return `Not enough stock: only ${error.onHand} on hand`;
  }

  if (error instanceof StockError) {
    switch (error.code) {
      case "NOT_FOUND":
        return "That product or warehouse no longer exists.";
      case "BUNDLE_STOCK_ERROR":
        return "Bundles don't hold stock; adjust their components.";
      case "INVALID_DELTA":
      case "INVALID_SETTING":
        return error.message;
      case "INSUFFICIENT_STOCK":
        return `Not enough stock: only ${(error as InsufficientStockError).onHand ?? 0} on hand`;
      default:
        return error.message;
    }
  }

  return "An unexpected error occurred. Please try again.";
}
