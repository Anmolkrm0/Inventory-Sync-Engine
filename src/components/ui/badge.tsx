import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-accent",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-white",
        secondary:
          "bg-ground text-ink border border-line",
        outline:
          "text-ink border border-line",
        good:
          "bg-good-soft text-good-text border border-good/20",
        warn:
          "bg-warn-soft text-warn-text border border-warn-border",
        bad:
          "bg-bad-soft text-bad-text border border-bad/20",
        accent:
          "bg-accent-soft text-accent-text border border-accent/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
