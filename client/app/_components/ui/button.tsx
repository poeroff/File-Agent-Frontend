"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// shadcn-style Button, dressed in the app's own tokens (accent accent, danger,
// canvas surfaces) so it matches the hand-built UI and follows dark mode.
const buttonVariants = cva(
  "inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3.5 text-sm font-medium transition outline-none focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-accent font-semibold text-white shadow-[inset_0_1px_0_#ffffff2e] outline-accent hover:bg-accent-strong",
        destructive:
          "bg-danger font-semibold text-white shadow-[inset_0_1px_0_#ffffff2e] outline-danger hover:brightness-110",
        ghost: "text-muted outline-accent hover:bg-canvas-sunken hover:text-ink",
      },
    },
    defaultVariants: { variant: "primary" },
  },
);

function Button({
  className,
  variant,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return (
    <button
      className={cn(buttonVariants({ variant, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
