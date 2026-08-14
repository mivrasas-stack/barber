"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const premiumButtonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-xs font-headline transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden group uppercase tracking-[0.2em] rounded-2xl",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-black font-semibold shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] hover:scale-[1.02] border border-amber-300/40",
        outline:
          "border border-amber-500/30 text-amber-500 bg-transparent hover:bg-amber-500/10 hover:border-amber-500/80 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:scale-[1.02]",
        ghost: "hover:bg-white/5 hover:text-amber-400 text-white/60 hover:scale-[1.02]",
        link: "text-amber-500 underline-offset-4 hover:underline",
        glass: "bg-white/5 backdrop-blur-xl border border-white/10 text-white hover:bg-white/10 hover:border-white/20 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:scale-[1.02]"
      },
      size: {
        default: "h-12 px-8 py-2",
        sm: "h-10 px-6 text-[10px]",
        lg: "h-14 px-10 text-sm",
        icon: "h-12 w-12",
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
    VariantProps<typeof premiumButtonVariants> {
  asChild?: boolean;
}

const PremiumButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(premiumButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
PremiumButton.displayName = "PremiumButton";

export { PremiumButton, premiumButtonVariants };
