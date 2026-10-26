"use client";

import React from "react";
import { Check, AlertTriangle } from "lucide-react";
import { ChannelTile } from "@/components/shared/ChannelTile";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import type { ConnectChannelCardItem } from "@/server/connect";
import { cn } from "@/lib/utils";

interface ChannelCardProps {
  channel: ConnectChannelCardItem;
}

export function ChannelCard({ channel }: ChannelCardProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <div className="rounded-[14px] border border-line bg-surface p-5 flex flex-col justify-between transition-all hover:border-line/80">
        <div className="space-y-4">
          {/* Header row: Icon + Title + Status Pill */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <ChannelTile type={channel.type} size="md" />
              <div>
                <h3 className="font-heading font-semibold text-ink text-base">
                  {channel.name}
                </h3>
                <p className="text-xs text-muted line-clamp-1">
                  {channel.description}
                </p>
              </div>
            </div>

            {/* Connected status badge */}
            {channel.connected && (
              channel.status === "REVIEW" ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-warn-soft text-warn-text border border-warn-border shrink-0">
                  <AlertTriangle className="h-3 w-3" />
                  Review
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-good-soft text-good-text shrink-0">
                  <Check className="h-3.5 w-3.5" />
                  Connected
                </span>
              )
            )}
          </div>

          {/* Connected store details or unconnected placeholder */}
          <div className="pt-2 border-t border-hairline space-y-2">
            {channel.connected ? (
              <div className="space-y-1.5">
                {channel.stores.map((store) => (
                  <div
                    key={store.id}
                    className="flex items-center justify-between text-xs py-1 px-2.5 rounded-[8px] bg-ground/60 border border-hairline/80"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono text-ink font-medium truncate">
                        {store.storeRef}
                      </span>
                    </div>
                    <span className="text-muted shrink-0 pl-2">
                      <strong className="font-mono text-ink font-semibold">
                        {store.listingCount}
                      </strong>{" "}
                      listings
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs py-2 px-2.5 rounded-[8px] bg-ground/40 text-muted">
                <span>Not connected</span>
                <span className="text-muted/60">— listings</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Button / Connection Info */}
        <div className="pt-4 mt-2">
          {channel.connected ? (
            <div className="flex items-center justify-between text-xs text-muted px-1 gap-2">
              {channel.status === "REVIEW" ? (
                <span className="flex items-center gap-1.5 text-warn-text font-medium shrink-0">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Review required
                </span>
              ) : (
                <span className="text-muted font-medium truncate">
                  Imported · sync arrives with channel connection
                </span>
              )}
              <span className="text-muted font-mono shrink-0">
                {channel.totalListingCount} total listings
              </span>
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="inline-block w-full">
                  <Button
                    disabled
                    className={cn(
                      "w-full h-[42px] rounded-[10px] bg-ink text-white font-medium",
                      "opacity-90 cursor-not-allowed hover:bg-ink"
                    )}
                  >
                    Connect {channel.name}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Arrives with channel sync</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
