import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-white hover:bg-accent-hover font-semibold",
        primary:
          "bg-accent text-white hover:bg-accent-hover font-semibold",
        accent:
          "bg-accent text-white hover:bg-accent-hover font-semibold",
        ink:
          "bg-ink text-white hover:bg-ink/90 font-medium",
        destructive:
          "bg-bad text-white hover:bg-bad/90 font-medium",
        outline:
          "border border-line bg-surface text-ink hover:bg-ground hover:text-ink font-medium",
        secondary:
          "bg-ground text-ink hover:bg-hairline font-medium",
        ghost:
          "hover:bg-ground text-ink hover:text-ink font-medium",
        link:
          "text-accent underline-offset-4 hover:underline",
      },
      size: {
        default: "h-[42px] px-4 py-2",
        sm: "h-9 rounded-[8px] px-3 text-xs",
        lg: "h-12 rounded-[10px] px-6 text-base",
        icon: "h-[42px] w-[42px] p-0",
        "icon-sm": "h-9 w-9 rounded-[8px] p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
