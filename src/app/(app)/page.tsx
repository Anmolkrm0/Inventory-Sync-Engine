import React from "react";
import { getCurrentAccountId } from "@/server/account";
import { getDashboardData, type DashboardRange } from "@/server/dashboard";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatInAppTimezone } from "@/server/timezone";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { KpiTile } from "@/components/shared/KpiTile";
import { OrdersChartCard } from "@/components/dashboard/OrdersChartCard";
import { ChannelsHealthCard } from "@/components/dashboard/ChannelsHealthCard";
import { RunningLowCard } from "@/components/dashboard/RunningLowCard";
import { LiveSyncFeedCard } from "@/components/dashboard/LiveSyncFeedCard";

interface DashboardPageProps {
  searchParams: Promise<{
    range?: string;
  }>;
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const resolvedParams = await searchParams;
  const range = (
    ["24h", "7d", "30d"].includes(resolvedParams.range ?? "")
      ? resolvedParams.range
      : "24h"
  ) as DashboardRange;

  const accountId = await getCurrentAccountId();
  const data = await getDashboardData(accountId, range);

  const todayFormatted = formatInAppTimezone(new Date(), {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="space-y-6 max-w-[1240px] mx-auto pb-12">
      <PageHeader
        title="Dashboard"
        description={todayFormatted}
        className="pb-0"
      />

      {/* 1. Header with Live push pill, GET search form, and Adjust stock trigger */}
      <DashboardHeader
        lastPushPill={data.lastPushPill}
        products={data.selectableProducts}
        warehouses={data.warehouses}
      />

      {/* 2. Four KPI tiles in a 4-column responsive grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile
          label={data.kpis.availableUnits.label}
          value={data.kpis.availableUnits.value}
          change={data.kpis.availableUnits.delta?.value}
          changeType={data.kpis.availableUnits.delta?.type}
          note={data.kpis.availableUnits.note}
          sparkline={data.kpis.availableUnits.sparkline}
          sparklineColor="accent"
        />
        <KpiTile
          label={data.kpis.ordersToday.label}
          value={data.kpis.ordersToday.value}
          note={data.kpis.ordersToday.note}
          sparkline={data.kpis.ordersToday.sparkline}
          sparklineColor="good"
        />
        <KpiTile
          label={data.kpis.lowStockSkus.label}
          value={data.kpis.lowStockSkus.value}
          note={data.kpis.lowStockSkus.note}
          sparkline={data.kpis.lowStockSkus.sparkline}
          sparklineColor="warn"
        />
        <KpiTile
          label={data.kpis.heldByCloseAt.label}
          value={data.kpis.heldByCloseAt.value}
          note={data.kpis.heldByCloseAt.note}
          sparkline={data.kpis.heldByCloseAt.sparkline}
          sparklineColor="accent"
        />
      </div>

      {/* 3. Orders Chart (8 cols) + Channels Health List (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8 flex flex-col">
          <OrdersChartCard chart={data.ordersChart} />
        </div>
        <div className="lg:col-span-4 flex flex-col">
          <ChannelsHealthCard channels={data.channels} />
        </div>
      </div>

      {/* 4. Running Low Table (6 cols) + Live Sync Feed (6 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <RunningLowCard items={data.runningLow} />
        <LiveSyncFeedCard items={data.liveFeed} />
      </div>
    </div>
  );
}
