import React from "react";
import { getCurrentAccount } from "@/server/account";
import { SidebarContent } from "@/components/layout/SidebarContent";
import { MobileHeader } from "@/components/layout/MobileHeader";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const account = await getCurrentAccount();

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full bg-ground text-ink">
      {/* Mobile Top Bar (<768px, 56px with Sheet) */}
      <MobileHeader account={account} />

      {/* Desktop Sidebar (>=768px, 232px width) */}
      <aside className="hidden md:flex w-[232px] min-h-screen shrink-0 bg-sidebar-bg border-r border-sidebar-border flex-col justify-between p-4 z-40">
        <SidebarContent account={account} />
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
