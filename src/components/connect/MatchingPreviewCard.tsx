import React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import type { MatchingPreviewData } from "@/server/connect";

interface MatchingPreviewCardProps {
  preview: MatchingPreviewData;
}

export function MatchingPreviewCard({ preview }: MatchingPreviewCardProps) {
  const {
    totalListings,
    matchedListings,
    unlinkedListings,
    matchedPercent,
    unlinkedPercent,
  } = preview;

  return (
    <div className="rounded-[14px] bg-sidebar-bg border border-sidebar-border p-6 text-white space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs uppercase font-mono tracking-wider text-sidebar-dim">
            Inventory Mapping
          </span>
          <h3 className="font-heading font-bold text-lg text-white mt-0.5">
            Matching preview
          </h3>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-sidebar-active text-sidebar-text border border-sidebar-border">
          Live DB
        </span>
      </div>

      {/* Big Number */}
      <div className="space-y-1">
        <div className="text-4xl font-heading font-bold text-white tracking-tight tabular-nums font-mono">
          {totalListings}
        </div>
        <p className="text-xs text-sidebar-dim">
          Total listings imported across connected channels
        </p>
      </div>

      {/* 2-Segment Bar (Matched vs Unlinked) */}
      <div className="space-y-2">
        <div className="h-3 w-full rounded-full bg-sidebar-active overflow-hidden flex" role="progressbar" aria-valuenow={matchedPercent} aria-valuemin={0} aria-valuemax={100}>
          {totalListings > 0 ? (
            <>
              <div
                style={{ width: `${matchedPercent}%` }}
                className="h-full bg-good transition-all duration-300"
                title={`${matchedListings} matched (${matchedPercent}%)`}
              />
              <div
                style={{ width: `${unlinkedPercent}%` }}
                className="h-full bg-warn transition-all duration-300"
                title={`${unlinkedListings} unlinked (${unlinkedPercent}%)`}
              />
            </>
          ) : (
            <div className="h-full w-full bg-sidebar-border" />
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-xs pt-1">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-good shrink-0" />
            <span className="text-sidebar-text">
              <strong className="text-white font-mono">{matchedListings}</strong> matched ({matchedPercent}%)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-warn shrink-0" />
            <span className="text-sidebar-text">
              <strong className="text-white font-mono">{unlinkedListings}</strong> unlinked ({unlinkedPercent}%)
            </span>
          </div>
        </div>
      </div>

      {/* Notice about unlinked */}
      {unlinkedListings > 0 ? (
        <div className="p-3 rounded-[10px] bg-sidebar-raised border border-sidebar-border flex items-start gap-2.5 text-xs text-sidebar-text">
          <AlertCircle className="h-4 w-4 text-warn shrink-0 mt-0.5" />
          <p>
            <strong className="text-white">{unlinkedListings} listings</strong> have not been linked to a master SKU yet. Unlinked listings do not receive automatic stock sync.
          </p>
        </div>
      ) : (
        <div className="p-3 rounded-[10px] bg-sidebar-raised border border-sidebar-border flex items-start gap-2.5 text-xs text-sidebar-text">
          <CheckCircle2 className="h-4 w-4 text-good shrink-0 mt-0.5" />
          <p>
            All connected channel listings are fully mapped to master SKUs.
          </p>
        </div>
      )}

      {/* Continue to Matching Button */}
      <Link
        href="/inventory?view=unlinked"
        className="flex items-center justify-center gap-2 w-full h-[42px] rounded-[10px] bg-accent hover:bg-accent-hover text-white font-medium text-sm transition-colors shadow-xs"
      >
        <span>Continue to matching</span>
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
