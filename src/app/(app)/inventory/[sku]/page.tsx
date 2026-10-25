import React from "react";
import { getCurrentAccountId } from "@/server/account";
import { getSkuDetail } from "@/server/sku";
import { SkuBreadcrumb } from "@/components/sku/SkuBreadcrumb";
import { SkuHeader } from "@/components/sku/SkuHeader";
import { SkuStats } from "@/components/sku/SkuStats";
import { WarehouseStockTable } from "@/components/sku/WarehouseStockTable";
import { LinkedListingsCard } from "@/components/sku/LinkedListingsCard";
import { StockTrendChart } from "@/components/sku/StockTrendChart";
import { ActivityLogCard } from "@/components/sku/ActivityLogCard";

interface SkuDetailPageProps {
  params: Promise<{
    sku: string;
  }>;
}

export default async function SkuDetailPage({ params }: SkuDetailPageProps) {
  const resolvedParams = await params;
  const decodedSku = decodeURIComponent(resolvedParams.sku);
  const accountId = await getCurrentAccountId();

  const data = await getSkuDetail(accountId, decodedSku);

  return (
    <div className="space-y-6 max-w-[1240px] mx-auto pb-12">
      {/* 1. Breadcrumb navigation */}
      <SkuBreadcrumb sku={data.product.sku} name={data.product.name} />

      {/* 2. Header with big swatch, title, chips, status, and adjust stock trigger */}
      <SkuHeader
        product={data.product}
        status={data.stats.status}
        warehouses={data.warehouseOptions}
        selectableProducts={data.selectableProducts}
      />

      {/* 3. Five stat cards (In stock, Booked, Available highlighted, Incoming, Runway in warn colors) */}
      <SkuStats stats={data.stats} />

      {/* 4. Stock by warehouse table with editable close-at input saving on blur */}
      <WarehouseStockTable
        productId={data.product.id}
        sku={data.product.sku}
        warehouses={data.warehouses}
      />

      {/* 5. Linked channel listings with outside-app change detection warning */}
      <LinkedListingsCard listings={data.listings} />

      {/* 6. Two-column grid: 30-day stock trend div bars + Activity log audit trail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <StockTrendChart trend={data.trend} status={data.stats.status} />
        <ActivityLogCard activities={data.activities} />
      </div>
    </div>
  );
}
