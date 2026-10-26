import React from "react";
import { getCurrentAccountId } from "@/server/account";
import { listBundlesWithAvailability } from "@/server/bundles";
import { PageHeader } from "@/components/shared/PageHeader";
import { BundleList } from "@/components/bundles/BundleList";
import { BundleDetail } from "@/components/bundles/BundleDetail";
import { Card } from "@/components/shared/Card";

interface BundlesPageProps {
  searchParams: Promise<{
    selected?: string;
  }>;
}

export default async function BundlesPage({ searchParams }: BundlesPageProps) {
  const resolvedParams = await searchParams;
  const accountId = await getCurrentAccountId();

  const bundles = await listBundlesWithAvailability(accountId);

  // Default to the first bundle if ?selected=<sku> is missing or not found
  const selectedSku =
    resolvedParams.selected &&
    bundles.some((b) => b.sku === resolvedParams.selected)
      ? resolvedParams.selected
      : bundles[0]?.sku ?? "";

  const selectedBundle =
    bundles.find((b) => b.sku === selectedSku) ?? bundles[0] ?? null;

  return (
    <div className="space-y-6 max-w-[1240px] mx-auto pb-12">
      <PageHeader
        title="Bundles"
        description="Multi-item bundles with real-time component availability and limiting part calculations."
      />

      {bundles.length === 0 ? (
        <Card className="p-12 text-center text-muted">
          No bundles configured yet.
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Bundle Cards List */}
          <div className="lg:col-span-5 xl:col-span-4">
            <BundleList bundles={bundles} selectedSku={selectedSku} />
          </div>

          {/* Right: Selected Bundle Detail Panel */}
          <div className="lg:col-span-7 xl:col-span-8">
            {selectedBundle && <BundleDetail bundle={selectedBundle} />}
          </div>
        </div>
      )}
    </div>
  );
}
