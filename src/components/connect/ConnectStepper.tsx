import React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface StepperStep {
  number: number;
  label: string;
  status: "complete" | "current" | "upcoming";
}

const STEPS: StepperStep[] = [
  { number: 1, label: "Connect channels", status: "current" },
  { number: 2, label: "Match listings", status: "upcoming" },
  { number: 3, label: "Warehouses", status: "upcoming" },
  { number: 4, label: "Go live", status: "upcoming" },
];

export function ConnectStepper({ className }: { className?: string }) {
  return (
    <nav aria-label="Onboarding Progress" className={cn("flex items-center", className)}>
      {/* Mobile compact view */}
      <div className="flex md:hidden items-center gap-2 text-xs">
        <span className="flex items-center justify-center h-5 w-5 rounded-full bg-accent text-white font-mono font-bold text-[11px]">
          1
        </span>
        <span className="text-white font-medium">Connect channels</span>
        <span className="text-sidebar-dim">· Step 1 of 4</span>
      </div>

      {/* Desktop 4-step stepper */}
      <ol className="hidden md:flex items-center gap-2 sm:gap-3 lg:gap-5 list-none m-0 p-0">
        {STEPS.map((step, idx) => {
          const isCurrent = step.status === "current";
          const isComplete = step.status === "complete";

          return (
            <li key={step.number} className="flex items-center gap-2 lg:gap-3">
              <div
                className={cn(
                  "flex items-center gap-2 px-2.5 py-1 rounded-[8px] text-xs font-medium transition-colors select-none",
                  isCurrent
                    ? "bg-[#1B2030] text-white"
                    : isComplete
                    ? "text-good-text"
                    : "text-sidebar-dim"
                )}
              >
                <span
                  className={cn(
                    "flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-mono font-bold shrink-0",
                    isCurrent
                      ? "bg-accent text-white"
                      : isComplete
                      ? "bg-good text-white"
                      : "bg-[#1B2030] text-sidebar-dim border border-sidebar-border"
                  )}
                >
                  {isComplete ? <Check className="h-3 w-3 stroke-[2.5]" /> : step.number}
                </span>
                <span className={cn(isCurrent ? "text-white font-semibold" : "")}>
                  {step.label}
                </span>
              </div>

              {idx < STEPS.length - 1 && (
                <div
                  className="w-4 lg:w-6 h-[1px] bg-sidebar-border shrink-0"
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
