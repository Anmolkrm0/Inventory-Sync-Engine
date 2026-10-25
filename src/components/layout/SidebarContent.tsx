import React from "react";
import { Activity, ChevronsUpDown } from "lucide-react";
import { type CurrentAccount } from "@/server/account";
import { SidebarNav } from "@/components/layout/SidebarNav";

export interface SidebarContentProps {
  account: CurrentAccount;
  onNavigate?: () => void;
}

export function SidebarContent({ account, onNavigate }: SidebarContentProps) {
  const initials = account.user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex flex-col justify-between h-full w-full select-none">
      <div className="flex flex-col gap-4">
        {/* Logo square 30px & App Title (no Control Room subtitle) */}
        <div className="flex items-center gap-2.5 px-1 pt-1">
          <div className="h-[30px] w-[30px] rounded-[7px] bg-accent flex items-center justify-center shrink-0 text-white shadow-xs">
            <Activity className="h-4 w-4" strokeWidth={2.2} />
          </div>
          <span className="font-heading font-bold text-sm text-white tracking-tight leading-none">
            Inventory Sync
          </span>
        </div>

        {/* Workspace button min-h-[44px] with two lines, no aria-label */}
        <button
          type="button"
          className="flex items-center justify-between w-full min-h-[44px] px-3 py-1.5 rounded-[8px] bg-sidebar-raised border border-sidebar-border text-white hover:bg-sidebar-active transition-colors cursor-pointer text-left group"
        >
          <div className="flex flex-col min-w-0 justify-center">
            <span className="text-[11px] text-sidebar-dim leading-none">
              Workspace
            </span>
            <span className="text-sm font-semibold text-white truncate mt-1 leading-tight">
              {account.name}
            </span>
          </div>
          <ChevronsUpDown
            className="h-3.5 w-3.5 text-sidebar-dim shrink-0 group-hover:text-white ml-2"
            strokeWidth={1.8}
          />
        </button>

        {/* Nav Items (py-2.5 min-h-[44px] text-sm) */}
        <SidebarNav onNavigate={onNavigate} />
      </div>

      {/* Bottom Section: Sync Card with static glow & User Profile (32px avatar, role: Owner) */}
      <div className="flex flex-col gap-3 mt-6 pt-4 border-t border-sidebar-border">
        {/* Sync engine healthy card with static glow (no animate-ping) */}
        <div className="rounded-[10px] bg-sidebar-raised border border-sidebar-border p-3 flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex rounded-full h-2 w-2 bg-good shadow-[0_0_8px_#12A150] shrink-0"
              aria-hidden="true"
            />
            <span className="text-xs font-semibold text-white tracking-tight">
              Sync engine healthy
            </span>
          </div>
          <p className="text-[11px] text-sidebar-dim leading-tight">
            All 5 channels live · median push 1.8s
          </p>
        </div>

        {/* User Row: 32px avatar, Title-Case Role */}
        <div className="flex items-center gap-2.5 px-1 py-1">
          <div className="h-8 w-8 rounded-full bg-sidebar-active border border-sidebar-border flex items-center justify-center shrink-0 text-xs font-semibold text-white">
            {initials}
          </div>
          <div className="flex flex-col truncate min-w-0">
            <span className="text-xs font-medium text-white truncate leading-none">
              {account.user.name}
            </span>
            <span className="text-[11px] text-sidebar-dim font-medium mt-1 leading-none">
              {account.user.role}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
