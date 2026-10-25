"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Boxes,
  Layers,
  FileText,
  RefreshCw,
  Radio,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Inventory", href: "/inventory", icon: Boxes },
  { label: "Bundles", href: "/bundles", icon: Layers },
  { label: "Purchase orders", href: "/purchase-orders", icon: FileText },
  { label: "Replenishment", href: "/replenishment", icon: RefreshCw },
  { label: "Channels", href: "/connect", icon: Radio },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 w-full" aria-label="Main Navigation">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-[10px] text-sm transition-colors select-none group",
              isActive
                ? "bg-[#1B2030] text-white font-medium shadow-xs"
                : "text-[#9AA3B2] hover:bg-[#151925] hover:text-[#C9CED8]"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon
              className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                isActive
                  ? "text-white"
                  : "text-[#9AA3B2] group-hover:text-[#C9CED8]"
              )}
              strokeWidth={1.8}
            />
            <span className="truncate">{item.label}</span>
            {isActive && (
              <span
                className="ml-auto h-1.5 w-1.5 rounded-full bg-accent shrink-0"
                aria-hidden="true"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
