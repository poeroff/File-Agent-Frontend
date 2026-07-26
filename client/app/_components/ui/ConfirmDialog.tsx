"use client";

import { TriangleAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/app/_components/ui/alert-dialog";

// Same API as before (parent mounts it conditionally); the portal, focus trap
// and Escape/dismissal are now handled by Radix AlertDialog.
export function ConfirmDialog({
  title,
  message,
  confirmLabel = "삭제",
  destructive = false,
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <div className="flex items-start gap-3.5 p-5">
          <div
            className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
              destructive
                ? "bg-danger-soft text-danger-text"
                : "bg-accent-soft text-accent-text"
            }`}
          >
            <TriangleAlert className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription className="mt-1.5">
              {message.split(/(?<=\.)\s+/).map((sentence, index) => (
                <span key={index} className="block">
                  {sentence}
                </span>
              ))}
            </AlertDialogDescription>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction destructive={destructive} onClick={onConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
