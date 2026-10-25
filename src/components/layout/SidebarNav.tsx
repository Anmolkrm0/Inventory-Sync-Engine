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

export interface SidebarNavProps {
  onNavigate?: () => void;
  className?: string;
}

export function SidebarNav({ onNavigate, className }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className={cn("flex flex-col gap-1 w-full", className)}
      aria-label="Main Navigation"
    >
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
            onClick={() => onNavigate?.()}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-[10px] text-sm transition-colors select-none group",
              isActive
                ? "bg-sidebar-active text-white font-medium shadow-xs"
                : "text-sidebar-text hover:bg-sidebar-raised hover:text-white"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon
              className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                isActive
                  ? "text-white"
                  : "text-sidebar-dim group-hover:text-sidebar-text"
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
