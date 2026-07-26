"use client";

import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/_components/ui/dialog";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";

// Same API as before; Radix Dialog now supplies the portal, focus trap and
// Escape/backdrop dismissal.
export function PromptDialog({
  title,
  label,
  initialValue = "",
  confirmLabel = "만들기",
  onConfirm,
  onClose,
}: {
  title: string;
  label: string;
  initialValue?: string;
  confirmLabel?: string;
  onConfirm: (value: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!value.trim()) return;
    onConfirm(value.trim());
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-sm"
        showCloseButton={false}
        // Select the existing text on open (used for rename), matching the
        // old inputRef.focus()/select() behaviour.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          inputRef.current?.focus();
          inputRef.current?.select();
        }}
      >
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <label
              htmlFor="prompt-dialog-input"
              className="mt-2.5 block text-[13px] font-medium text-muted"
            >
              {label}
            </label>
            <Input
              id="prompt-dialog-input"
              ref={inputRef}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className="mt-1.5 h-10"
            />
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" disabled={!value.trim()}>
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
