import React from "react";
import Link from "next/link";
import { Activity, ArrowLeft } from "lucide-react";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-ground flex flex-col text-ink">
      {/* Dark top bar */}
      <header className="w-full bg-[#0B0D12] border-b border-[#232838] px-6 py-4 flex items-center justify-between z-40">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-white hover:opacity-90 transition-opacity"
          >
            <div className="h-7 w-7 rounded-[7px] bg-accent flex items-center justify-center text-white">
              <Activity className="h-4 w-4" strokeWidth={2.2} />
            </div>
            <span className="font-heading font-bold text-sm text-white tracking-tight">
              Inventory Sync
            </span>
          </Link>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-[#9AA3B2] hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Dashboard
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 w-full max-w-[1240px] mx-auto px-4 sm:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
