import React from "react";
import Link from "next/link";
import { Card } from "@/components/shared/Card";
import { ChannelTile } from "@/components/shared/ChannelTile";
import type { DashboardChannelItem } from "@/server/dashboard";
import { Radio, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChannelStatus } from "@prisma/client";

export interface ChannelsHealthCardProps {
  channels: DashboardChannelItem[];
}

const statusDotStyles: Record<ChannelStatus, { dot: string; label: string }> = {
  LIVE: { dot: "bg-good shadow-[0_0_6px_#12A150]", label: "Live" },
  REVIEW: { dot: "bg-warn shadow-[0_0_6px_#F2A33A]", label: "Review" },
  ERROR: { dot: "bg-bad shadow-[0_0_6px_#D12E3A]", label: "Error" },
  PAUSED: { dot: "bg-muted", label: "Paused" },
};

export function ChannelsHealthCard({ channels }: ChannelsHealthCardProps) {
  return (
    <Card className="p-0 overflow-hidden flex flex-col justify-between">
      <div>
        <div className="px-5 py-4 border-b border-hairline flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-muted" />
            <h2 className="font-heading text-base font-semibold text-ink">
              Channel health
            </h2>
          </div>
          <Link
            href="/connect"
            className="text-xs font-medium text-accent hover:text-accent-hover flex items-center gap-1 transition-colors"
          >
            <span>Manage</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {channels.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted">
            No sales channels connected yet.
          </div>
        ) : (
          <div className="divide-y divide-hairline">
            {channels.map((ch) => {
              const statusCfg = statusDotStyles[ch.status] ?? statusDotStyles.LIVE;

              return (
                <div
                  key={ch.id}
                  className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-ground/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ChannelTile type={ch.type} size="sm" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-ink truncate">
                        {ch.name}
                      </p>
                      <p className="text-[11px] text-muted truncate">
                        {ch.storeRef}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-xs text-muted">
                      {ch.listingCount} {ch.listingCount === 1 ? "listing" : "listings"}
                    </span>
                    <div className="flex items-center gap-1.5" title={statusCfg.label}>
                      <span
                        className={cn("h-2 w-2 rounded-full", statusCfg.dot)}
                        aria-hidden="true"
                      />
                      <span className="text-[11px] font-medium text-muted">
                        {statusCfg.label}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-3 px-5 border-t border-hairline bg-ground/30">
        <span className="text-[11px] text-muted font-mono">
          {channels.filter((c) => c.status === "LIVE").length} of {channels.length} channels syncing normally
        </span>
      </div>
    </Card>
  );
}
