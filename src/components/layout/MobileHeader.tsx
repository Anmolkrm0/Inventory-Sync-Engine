"use client";

import React, { useState } from "react";
import { Menu, Activity } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { type CurrentAccount } from "@/server/account";
import { SidebarContent } from "@/components/layout/SidebarContent";

export function MobileHeader({ account }: { account: CurrentAccount }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="md:hidden flex items-center justify-between h-[56px] w-full bg-sidebar-bg border-b border-sidebar-border px-4 z-40 sticky top-0 shrink-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="h-[30px] w-[30px] rounded-[7px] bg-accent flex items-center justify-center shrink-0 text-white shadow-xs">
          <Activity className="h-4 w-4" strokeWidth={2.2} />
        </div>
        <span className="font-heading font-semibold text-sm text-white truncate">
          {account.name}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-11 w-11 flex items-center justify-center rounded-[8px] text-sidebar-text hover:text-white hover:bg-sidebar-raised transition-colors cursor-pointer"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" strokeWidth={1.8} />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="w-[280px] p-4 bg-sidebar-bg border-r border-sidebar-border text-sidebar-text flex flex-col justify-between"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent
            account={account}
            onNavigate={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </header>
  );
}
