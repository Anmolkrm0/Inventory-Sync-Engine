import React from "react";
import { Card } from "@/components/shared/Card";
import { ChannelTile } from "@/components/shared/ChannelTile";
import type { SkuListingItem } from "@/server/sku";
import { AlertTriangle, CheckCircle2, Link2 } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

export interface LinkedListingsCardProps {
  listings: SkuListingItem[];
}

export function LinkedListingsCard({ listings }: LinkedListingsCardProps) {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-5 py-4 border-b border-hairline flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-muted" />
          <h2 className="font-heading text-base font-semibold text-ink">
            Linked channel listings
          </h2>
        </div>
        <span className="text-xs text-muted font-mono">
          {listings.length} connected {listings.length === 1 ? "channel" : "channels"}
        </span>
      </div>

      {listings.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted">
          No sales channels currently linked to this SKU.
        </div>
      ) : (
        <div className="divide-y divide-hairline">
          {listings.map((l) => {
            const relativePushTime = formatRelativeTime(l.lastPushedAt);

            return (
              <div
                key={l.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-ground/40 transition-colors"
              >
                {/* Left: Channel + Title + ID */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5">
                    <ChannelTile type={l.channel.type} size="md" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-ink">
                        {l.channel.name}
                      </span>
                      {l.isPrimary && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-ground text-ink border border-line px-1.5 py-0.5 rounded-[4px]">
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-ink truncate">
                      {l.title}
                    </p>
                    <p className="text-xs font-mono text-muted">
                      ID: {l.externalId}
                    </p>
                  </div>
                </div>

                {/* Right: Sync Status & Warning */}
                <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
                  {l.changedOutsideApp ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-warn-soft border border-warn-border text-warn-text text-xs font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Changed outside app · review</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-good-text">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Synced to channel</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs font-mono text-muted">
                    <span>
                      Pushed:{" "}
                      <strong className="text-ink font-semibold">
                        {l.lastPushedQty ?? "—"}
                      </strong>
                    </span>
                    <span>·</span>
                    <span>
                      Channel:{" "}
                      <strong
                        className={
                          l.changedOutsideApp
                            ? "text-warn-text font-bold"
                            : "text-ink font-semibold"
                        }
                      >
                        {l.channelQty ?? "—"}
                      </strong>
                    </span>
                    <span>·</span>
                    <span className="text-[11px] font-sans text-muted">
                      {relativePushTime}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
