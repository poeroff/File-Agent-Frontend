"use client";

import * as React from "react";
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
}: React.ComponentProps<"div"> & {
  value?: number;
  indicatorClassName?: string;
}) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      className={cn(
        "relative h-1 w-full overflow-hidden rounded-full bg-chrome-fill",
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "h-full w-full flex-1 rounded-full bg-accent transition-transform duration-300",
          indicatorClassName,
        )}
        style={{ transform: `translateX(-${100 - value}%)` }}
      />
      {children}
    </div>
  );
}

export { Progress };
