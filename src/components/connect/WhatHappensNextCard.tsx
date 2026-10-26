import React from "react";
import { Layers, Warehouse, Send, Zap } from "lucide-react";

const NEXT_STEPS = [
  {
    icon: Layers,
    title: "Match listings to inventory SKUs",
    description:
      "We'll map identical SKUs across channels and flag unlinked items for manual review.",
  },
  {
    icon: Warehouse,
    title: "Configure warehouse routing & close-at",
    description:
      "Select fulfillment warehouses for each store and set safety buffers to prevent oversells.",
  },
  {
    icon: Send,
    title: "Publish master available stock",
    description:
      "One master count (In stock − Booked) is pushed to all linked channels simultaneously.",
  },
  {
    icon: Zap,
    title: "Automated real-time sync begins",
    description:
      "Sales, cancellations, and restocks are processed and synchronized across all stores in seconds.",
  },
];

export function WhatHappensNextCard() {
  return (
    <div className="rounded-[14px] border border-line bg-surface p-6 space-y-4">
      <h3 className="font-heading font-semibold text-ink text-base">
        What happens next
      </h3>

      <div className="space-y-4 pt-1">
        {NEXT_STEPS.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div key={idx} className="flex items-start gap-3">
              <div className="flex items-center justify-center h-7 w-7 rounded-[8px] bg-accent-soft text-accent shrink-0 mt-0.5">
                <Icon className="h-3.5 w-3.5" strokeWidth={2} />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-semibold text-ink">
                  {step.title}
                </h4>
                <p className="text-xs text-muted leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
