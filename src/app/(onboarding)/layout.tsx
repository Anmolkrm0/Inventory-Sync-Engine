import React from "react";
import Link from "next/link";
import { Activity, ArrowLeft } from "lucide-react";
import { ConnectStepper } from "@/components/connect/ConnectStepper";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-ground flex flex-col text-ink">
      {/* Dark top bar with 4-step stepper */}
      <header className="w-full bg-sidebar-bg border-b border-sidebar-border px-4 sm:px-6 py-3.5 flex items-center justify-between z-40 sticky top-0">
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-white hover:opacity-90 transition-opacity"
          >
            <div className="h-7 w-7 rounded-[7px] bg-accent flex items-center justify-center text-white">
              <Activity className="h-4 w-4" strokeWidth={2.2} />
            </div>
            <span className="font-heading font-bold text-sm text-white tracking-tight hidden sm:inline">
              Inventory Sync
            </span>
          </Link>
        </div>

        {/* 4-step stepper in dark top bar */}
        <ConnectStepper />

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 sm:gap-2 text-xs font-medium text-sidebar-dim hover:text-white transition-colors shrink-0"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Back to Dashboard</span>
          <span className="sm:hidden">Exit</span>
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 w-full max-w-[1240px] mx-auto px-4 sm:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
