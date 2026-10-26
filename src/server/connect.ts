import { prisma } from "@/server/db";
import { type ChannelStatus, type ChannelType } from "@prisma/client";

export interface ConnectedStoreInfo {
  id: string;
  name: string;
  storeRef: string;
  status: ChannelStatus;
  listingCount: number;
  lastSyncedAt: Date | null;
}

export interface ConnectChannelCardItem {
  type: ChannelType;
  name: string;
  description: string;
  connected: boolean;
  status?: ChannelStatus;
  primaryStoreRef?: string;
  totalListingCount: number;
  stores: ConnectedStoreInfo[];
}

export interface MatchingPreviewData {
  totalListings: number;
  matchedListings: number;
  unlinkedListings: number;
  matchedPercent: number;
  unlinkedPercent: number;
}

export interface ConnectPageData {
  channels: ConnectChannelCardItem[];
  matchingPreview: MatchingPreviewData;
}

const CHANNEL_DEFINITIONS: Array<{
  type: ChannelType;
  name: string;
  description: string;
}> = [
  {
    type: "SHOPIFY",
    name: "Shopify",
    description: "Direct API sync for products, orders, and multi-location inventory.",
  },
  {
    type: "AMAZON",
    name: "Amazon",
    description: "Amazon Seller Central SP-API integration for FBM stock.",
  },
  {
    type: "ETSY",
    name: "Etsy",
    description: "Multi-shop inventory management with real-time stock sync.",
  },
  {
    type: "WOOCOMMERCE",
    name: "WooCommerce",
    description: "Automated sync via WooCommerce REST API.",
  },
  {
    type: "EBAY",
    name: "eBay",
    description: "eBay Trading & Fulfillment API for active listings sync.",
  },
  {
    type: "WALMART",
    name: "Walmart",
    description: "Walmart Marketplace API sync for marketplace stock levels.",
  },
];

export async function getConnectPageData(
  accountId: string
): Promise<ConnectPageData> {
  // 1. Fetch all channels for this account with listing count
  const dbChannels = await prisma.channel.findMany({
    where: { accountId },
    include: {
      _count: {
        select: { listings: true },
      },
    },
    orderBy: { name: "asc" },
  });

  // Group by channel type
  const channelsByType = new Map<ChannelType, typeof dbChannels>();
  for (const ch of dbChannels) {
    const list = channelsByType.get(ch.type) ?? [];
    list.push(ch);
    channelsByType.set(ch.type, list);
  }

  const channelCards: ConnectChannelCardItem[] = CHANNEL_DEFINITIONS.map(
    (def) => {
      const matchingChannels = channelsByType.get(def.type) ?? [];
      const connected = matchingChannels.length > 0;

      const stores: ConnectedStoreInfo[] = matchingChannels.map((c) => ({
        id: c.id,
        name: c.name,
        storeRef: c.storeRef,
        status: c.status,
        listingCount: c._count.listings,
        lastSyncedAt: c.lastSyncedAt,
      }));

      const totalListingCount = stores.reduce(
        (sum, s) => sum + s.listingCount,
        0
      );

      // Determine overall status for this channel card
      let status: ChannelStatus | undefined = undefined;
      if (connected) {
        if (stores.some((s) => s.status === "ERROR")) {
          status = "ERROR";
        } else if (stores.some((s) => s.status === "REVIEW")) {
          status = "REVIEW";
        } else if (stores.some((s) => s.status === "PAUSED")) {
          status = "PAUSED";
        } else {
          status = "LIVE";
        }
      }

      const primaryStoreRef =
        stores.length === 1
          ? stores[0].storeRef
          : stores.length > 1
          ? `${stores.length} connected stores`
          : undefined;

      return {
        type: def.type,
        name: def.name,
        description: def.description,
        connected,
        status,
        primaryStoreRef,
        totalListingCount,
        stores,
      };
    }
  );

  // 2. Matching preview real counts from database
  const [totalListings, matchedListings, unlinkedListings] = await Promise.all([
    prisma.listing.count({
      where: { channel: { accountId } },
    }),
    prisma.listing.count({
      where: {
        channel: { accountId },
        productId: { not: null },
      },
    }),
    prisma.listing.count({
      where: {
        channel: { accountId },
        productId: null,
      },
    }),
  ]);

  const matchedPercent =
    totalListings > 0 ? Math.round((matchedListings / totalListings) * 100) : 0;
  const unlinkedPercent =
    totalListings > 0 ? 100 - matchedPercent : 0;

  return {
    channels: channelCards,
    matchingPreview: {
      totalListings,
      matchedListings,
      unlinkedListings,
      matchedPercent,
      unlinkedPercent,
    },
  };
}
