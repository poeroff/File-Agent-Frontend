"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// shadcn-style Button, dressed in the app's own tokens (accent accent, danger,
// canvas surfaces) so it matches the hand-built UI and follows dark mode.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition outline-none focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-accent font-semibold text-white shadow-[inset_0_1px_0_#ffffff2e] outline-accent hover:bg-accent-strong",
        destructive:
          "bg-danger font-semibold text-white shadow-[inset_0_1px_0_#ffffff2e] outline-danger hover:brightness-110",
        outline:
          "border border-line bg-card text-ink outline-accent hover:bg-canvas-sunken",
        ghost: "text-muted outline-accent hover:bg-canvas-sunken hover:text-ink",
        subtle: "text-muted outline-accent hover:bg-canvas-sunken hover:text-ink",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        default: "h-9 px-3.5",
        lg: "h-10 px-5",
        icon: "h-8 w-8 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
