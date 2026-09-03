"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

// Radix supplies the behaviour the hand-rolled menu did by hand: portalling,
// collision-aware positioning (flip/slide near edges), outside-click/Escape
// dismissal, and full keyboard navigation. Styling stays on the app's tokens.

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

function DropdownMenuContent({
  className,
  sideOffset = 6,
  align = "end",
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        align={align}
        className={cn(
          "anim-pop-in z-50 min-w-52 origin-[var(--radix-dropdown-menu-content-transform-origin)] overflow-hidden rounded-xl border border-line bg-card-raised p-1.5 text-sm shadow-pop",
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

function DropdownMenuItem({
  className,
  destructive = false,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  destructive?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        "flex w-full cursor-default select-none items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left outline-none transition data-[disabled]:pointer-events-none data-[disabled]:opacity-40 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0",
        destructive
          ? "text-danger-text data-[highlighted]:bg-danger-soft"
          : "text-ink/90 data-[highlighted]:bg-canvas-sunken [&_svg]:text-faint",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      className={cn("my-1.5 h-px bg-line", className)}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
};
