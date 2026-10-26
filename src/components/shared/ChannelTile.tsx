import React from "react";
import type { ChannelType } from "@prisma/client";
import { cn } from "@/lib/utils";

export interface ChannelTileProps extends React.HTMLAttributes<HTMLSpanElement> {
  type: ChannelType | "SHOPIFY" | "AMAZON" | "ETSY" | "WOOCOMMERCE" | "EBAY" | "WALMART";
  name?: string;
  size?: "xs" | "sm" | "md";
  showLabel?: boolean;
}

const channelConfig: Record<
  string,
  { label: string; initial: string; bg: string; text: string }
> = {
  SHOPIFY: {
    label: "Shopify",
    initial: "S",
    bg: "bg-channel-shopify",
    text: "text-white",
  },
  AMAZON: {
    label: "Amazon",
    initial: "A",
    bg: "bg-channel-amazon",
    text: "text-white",
  },
  ETSY: {
    label: "Etsy",
    initial: "E",
    bg: "bg-channel-etsy",
    text: "text-white",
  },
  WOOCOMMERCE: {
    label: "WooCommerce",
    initial: "W",
    bg: "bg-channel-woocommerce",
    text: "text-white",
  },
  EBAY: {
    label: "eBay",
    initial: "e",
    bg: "bg-channel-ebay",
    text: "text-white",
  },
  WALMART: {
    label: "Walmart",
    initial: "W",
    bg: "bg-channel-walmart",
    text: "text-white",
  },
};

export function ChannelTile({
  type,
  name,
  size = "sm",
  showLabel = false,
  className,
  ...props
}: ChannelTileProps) {
  const config = channelConfig[type] ?? {
    label: type,
    initial: type.charAt(0),
    bg: "bg-ink",
    text: "text-white",
  };

  const sizeClasses = {
    xs: "h-4 w-4 text-[9px] rounded-[4px]",
    sm: "h-5 w-5 text-[10px] rounded-[5px]",
    md: "h-7 w-7 text-xs rounded-[7px]",
  };

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 shrink-0", className)}
      title={name ?? config.label}
      {...props}
    >
      <span
        className={cn(
          "inline-flex items-center justify-center font-bold select-none",
          config.bg,
          config.text,
          sizeClasses[size]
        )}
      >
        {config.initial}
      </span>
      {showLabel && (
        <span className="text-xs font-medium text-ink">
          {name ?? config.label}
        </span>
      )}
    </span>
  );
}
