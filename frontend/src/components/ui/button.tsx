import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-2xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 lh-ui-button",
  {
    variants: {
      variant: {
        default:
          "border border-primary bg-gradient-to-b from-primary to-primary/90 text-white shadow-[0_12px_24px_hsl(var(--primary)/0.2)] hover:-translate-y-0.5 hover:shadow-[0_16px_28px_hsl(var(--primary)/0.26)]",
        outline:
          "border border-border bg-background text-foreground shadow-[0_6px_18px_hsl(var(--foreground)/0.06)] hover:-translate-y-0.5 hover:border-border hover:bg-muted",
        ghost: "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
        destructive:
          "border border-rose-200 bg-gradient-to-b from-rose-500 to-rose-600 text-white shadow-[0_12px_24px_rgba(244,63,94,0.18)] hover:-translate-y-0.5",
      },
      size: {
        default: "lh-ui-button--default",
        sm: "lh-ui-button--sm text-[13px]",
        lg: "lh-ui-button--lg text-[15px]",
        icon: "lh-ui-button--icon rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
