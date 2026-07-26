"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

// A single-value bar with a proper role="progressbar" and aria values. The
// track and indicator are separately styleable so callers can keep their own
// colours/heights (and layer extras like the upload sheen inside the track).
function Progress({
  className,
  indicatorClassName,
  value = 0,
  children,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
  indicatorClassName?: string;
}) {
  return (
    <ProgressPrimitive.Root
      value={value}
      className={cn(
        "relative h-1 w-full overflow-hidden rounded-full bg-chrome-fill",
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full w-full flex-1 rounded-full bg-accent transition-transform duration-300",
          indicatorClassName,
        )}
        style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
      />
      {children}
    </ProgressPrimitive.Root>
  );
}

export { Progress };
