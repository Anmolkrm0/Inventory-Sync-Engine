import React from "react";
import Link from "next/link";
import { StatusPill } from "@/components/shared/StatusPill";
import type { BundleDetailItem } from "@/server/bundles";
import { cn } from "@/lib/utils";

export interface BundleListProps {
  bundles: BundleDetailItem[];
  selectedSku: string;
}

export function BundleList({ bundles, selectedSku }: BundleListProps) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between pb-1 px-1">
        <span className="text-xs font-semibold text-muted uppercase tracking-wider">
          All Bundles ({bundles.length})
        </span>
      </div>

      <div className="space-y-2">
        {bundles.map((bundle) => {
          const isSelected = bundle.sku === selectedSku;

          return (
            <Link
              key={bundle.id}
              href={`/bundles?selected=${encodeURIComponent(bundle.sku)}`}
              scroll={false}
              className={cn(
                "block rounded-[14px] p-4 transition-all text-left select-none",
                isSelected
                  ? "border-2 border-accent bg-surface shadow-sm ring-1 ring-accent/20"
                  : "border border-line bg-surface hover:border-line/90 hover:bg-ground/40"
              )}
            >
              <div className="flex items-start gap-3">
                {/* Bundle Swatch */}
                <div
                  className="w-10 h-10 rounded-[8px] border border-line shrink-0 flex items-center justify-center shadow-2xs"
                  style={{ backgroundColor: bundle.swatch ?? "#EBF8FF" }}
                  aria-hidden="true"
                />

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-heading text-sm font-semibold text-ink truncate">
                      {bundle.name}
                    </p>
                  </div>
                  <p className="font-mono text-xs text-muted">
                    {bundle.sku}
                  </p>
                </div>
              </div>

              {/* Bottom stats row */}
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-hairline">
                <div className="flex items-baseline gap-1.5 font-mono">
                  <span className="text-lg font-bold tabular-nums text-ink">
                    {bundle.available}
                  </span>
                  <span className="text-xs text-muted font-sans">
                    available to sell
                  </span>
                </div>

                <StatusPill status={bundle.status} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
