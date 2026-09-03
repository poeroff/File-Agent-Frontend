import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// This file exists for shadcn/ui. Its components live in app/_components/ui and
// all import `cn` from `@/lib/utils` — the path shadcn expects by convention
// (see components.json), which is why it sits here at the root rather than in
// app/_lib with the app's own logic. `pnpm dlx shadcn add …` relies on it too.

/** Merge conditional class names, with later Tailwind utilities winning. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
