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
  constructor(message = "Insufficient stock") {
    super(message, "INSUFFICIENT_STOCK");
    this.name = "InsufficientStockError";
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
