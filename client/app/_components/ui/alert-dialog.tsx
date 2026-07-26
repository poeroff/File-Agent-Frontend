"use client";

import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/app/_components/ui/button";

// Like Dialog, but for confirmations: no backdrop-click dismissal by default,
// focus lands on the cancel action, and it's announced as an alertdialog.

const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

function AlertDialogContent({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay className="anim-fade-in fixed inset-0 z-50 bg-scrim backdrop-blur-[2px]" />
      {/* Flex-centred (not transform-centred) so the pop-in transform animation
          doesn't clobber the centring. */}
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
        <AlertDialogPrimitive.Content
          className={cn(
            "anim-pop-in pointer-events-auto relative w-full max-w-md overflow-hidden rounded-2xl border border-line bg-card-raised shadow-pop outline-none",
            className,
          )}
          {...props}
        />
      </div>
    </AlertDialogPrimitive.Portal>
  );
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      className={cn(
        "text-[15px] font-semibold tracking-tight text-ink",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      className={cn(
        "break-keep text-[13px] leading-relaxed text-muted",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex justify-end gap-2 border-t border-line bg-canvas/60 px-4 py-3",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogAction({
  className,
  destructive = false,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action> & {
  destructive?: boolean;
}) {
  return (
    <AlertDialogPrimitive.Action
      className={cn(
        buttonVariants({ variant: destructive ? "destructive" : "primary" }),
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogCancel({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return (
    <AlertDialogPrimitive.Cancel
      className={cn(buttonVariants({ variant: "ghost" }), className)}
      {...props}
    />
  );
}

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
};
