import React from "react";
import { getCurrentAccountId } from "@/server/account";
import { getConnectPageData } from "@/server/connect";
import { ChannelCard } from "@/components/connect/ChannelCard";
import { MatchingPreviewCard } from "@/components/connect/MatchingPreviewCard";
import { WhatHappensNextCard } from "@/components/connect/WhatHappensNextCard";

export default async function ConnectPage() {
  const accountId = await getCurrentAccountId();
  const data = await getConnectPageData(accountId);

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div className="space-y-1.5">
        <span className="text-xs font-mono uppercase tracking-wider font-semibold text-accent">
          Step 1 of 4
        </span>
        <h1 className="text-[34px] font-bold font-heading text-ink leading-tight tracking-tight">
          Connect sales channels
        </h1>
        <p className="text-sm text-muted max-w-2xl">
          Connect your sales channels. We&apos;ll pull your active listings and match them against your master inventory across all warehouses.
        </p>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: 6 Channel Cards Grid */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          <div className="flex items-center justify-between pb-1">
            <h2 className="font-heading font-semibold text-sm text-muted uppercase tracking-wider">
              Available Integrations
            </h2>
            <span className="text-xs font-mono text-muted">
              {data.channels.filter((c) => c.connected).length} of {data.channels.length} connected
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.channels.map((channel) => (
              <ChannelCard key={channel.type} channel={channel} />
            ))}
          </div>
        </div>

        {/* Right Column: Dark Matching Preview + What Happens Next */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          <MatchingPreviewCard preview={data.matchingPreview} />
          <WhatHappensNextCard />
        </div>
      </div>
    </div>
  );
}
