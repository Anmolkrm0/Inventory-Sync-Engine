import React from "react";
import { Activity, ChevronsUpDown } from "lucide-react";
import { getCurrentAccountId } from "@/server/account";
import { prisma } from "@/server/db";
import { SidebarNav } from "@/components/layout/SidebarNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const accountId = await getCurrentAccountId();
  const account = await prisma.account.findUniqueOrThrow({
    where: { id: accountId },
    include: {
      users: {
        take: 1,
      },
    },
  });

  const currentUser = account.users[0] ?? {
    name: "Anmol K.",
    role: "OWNER",
  };

  // Get user initials
  const initials = currentUser.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full bg-ground text-ink">
      {/* Precision Dark Sidebar */}
      <aside className="w-full md:w-[232px] md:min-h-screen md:shrink-0 bg-[#0B0D12] border-b md:border-b-0 md:border-r border-[#232838] flex flex-col justify-between p-4 z-40">
        <div className="flex flex-col gap-5">
          {/* Logo & App title */}
          <div className="flex items-center gap-2.5 px-1 pt-1">
            <div className="h-7 w-7 rounded-[7px] bg-accent flex items-center justify-center shrink-0 text-white shadow-xs">
              <Activity className="h-4 w-4" strokeWidth={2.2} />
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-bold text-sm text-white tracking-tight leading-none">
                Inventory Sync
              </span>
              <span className="text-[10px] text-[#9AA3B2] tracking-wider uppercase font-semibold mt-0.5">
                Control Room
              </span>
            </div>
          </div>

          {/* Workspace Switcher Button */}
          <button
            type="button"
            className="flex items-center justify-between w-full h-[38px] px-2.5 rounded-[8px] bg-[#151925] border border-[#232838] text-white hover:bg-[#1B2030] transition-colors cursor-pointer text-left select-none group"
            aria-label="Workspace switcher"
          >
            <div className="flex items-center gap-2 truncate">
              <div className="h-2 w-2 rounded-full bg-accent shrink-0" />
              <span className="text-xs font-medium text-white truncate">
                {account.name}
              </span>
            </div>
            <ChevronsUpDown
              className="h-3.5 w-3.5 text-[#9AA3B2] shrink-0 group-hover:text-white"
              strokeWidth={1.8}
            />
          </button>

          {/* Navigation Links */}
          <SidebarNav />
        </div>

        {/* Bottom Section: Sync Engine Status & User Profile */}
        <div className="flex flex-col gap-3 mt-6 pt-4 border-t border-[#232838]">
          {/* Sync engine healthy card */}
          <div className="rounded-[10px] bg-[#151925] border border-[#232838] p-3 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-good opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-good shadow-[0_0_6px_#12A150]" />
              </span>
              <span className="text-xs font-semibold text-white tracking-tight">
                Sync engine healthy
              </span>
            </div>
            <p className="text-[11px] text-[#9AA3B2] leading-tight">
              All 5 channels live · median push 1.8s
            </p>
          </div>

          {/* User Row */}
          <div className="flex items-center gap-2.5 px-1 py-1">
            <div className="h-7 w-7 rounded-full bg-[#1B2030] border border-[#232838] flex items-center justify-center shrink-0 text-[11px] font-semibold text-white">
              {initials}
            </div>
            <div className="flex flex-col truncate min-w-0">
              <span className="text-xs font-medium text-white truncate leading-none">
                {currentUser.name}
              </span>
              <span className="text-[10px] text-[#9AA3B2] uppercase font-semibold mt-0.5">
                {currentUser.role}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 bg-ground">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-8 pt-7 pb-12 w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
