import { labelForFile, styleForFile } from "@/app/_lib/file-icon";
import type { DriveItemType } from "@/app/_lib/types";

/**
 * The app's own file iconography — the signature of the "records room" look.
 *
 * A file is a sheet of paper wearing a printed label: its extension in mono
 * caps on a chip coloured by category. A folder is a manila folder, tab and
 * all. Both are drawn here as SVG rather than pulled from an icon set, so
 * the extension is readable at a glance and nothing looks like stock.
 */

function FolderGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 34" className={className} aria-hidden>
      {/* Back panel, tab included — a slightly deeper manila. */}
      <path
        d="M2 6.5C2 5.1 3.1 4 4.5 4h10.2c.8 0 1.5.3 2 .9l2.1 2.4h14.7c1.4 0 2.5 1.1 2.5 2.5V28c0 1.4-1.1 2.5-2.5 2.5h-29A2.5 2.5 0 0 1 2 28V6.5Z"
        fill="#cf9f35"
      />
      {/* Front panel: hangs from a fold line, lighter where light hits. */}
      <path
        d="M2 12.6c0-1.4 1.1-2.5 2.5-2.5h31c1.4 0 2.6 1.2 2.4 2.6l-1.8 15.3a2.5 2.5 0 0 1-2.5 2.2H4.4a2.5 2.5 0 0 1-2.4-2.2V12.6Z"
        fill="#e6c05c"
      />
      {/* The fold's shadow keeps the two panels reading as paper, not flat shapes. */}
      <path d="M2 12.6c0-1.4 1.1-2.5 2.5-2.5h31c.6 0 1.1.2 1.5.6l-.2 1.9H2Z" fill="#00000014" />
    </svg>
  );
}

function FileGlyph({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  const { color } = styleForFile(name);
  const label = labelForFile(name);
  return (
    <svg viewBox="0 0 34 40" className={className} aria-hidden>
      {/* Sheet with a folded corner. */}
      <path
        d="M6 4.5C6 3.1 7.1 2 8.5 2H22l8 8v25.5c0 1.4-1.1 2.5-2.5 2.5h-19A2.5 2.5 0 0 1 6 35.5v-31Z"
        fill="#ffffff"
        stroke="#b9beba"
        strokeWidth="1.2"
      />
      <path d="M22 2l8 8h-6.5A1.5 1.5 0 0 1 22 8.5V2Z" fill="#dfe3e0" stroke="#b9beba" strokeWidth="1.2" strokeLinejoin="round" />
      {/* Faint ruling so the sheet reads as a document even at list size. */}
      <path d="M10.5 17h13M10.5 21.5h13" stroke="#d5dad6" strokeWidth="1.4" strokeLinecap="round" />
      {/* The printed label chip, hanging past the sheet's left edge. */}
      <rect x="2" y="25" width="24" height="10.5" rx="2.4" fill={color} />
      <text
        x="14"
        y="32.9"
        textAnchor="middle"
        fontFamily="var(--font-geist-mono), ui-monospace, monospace"
        fontSize="7.4"
        fontWeight="700"
        letterSpacing="0.4"
        fill="#ffffff"
      >
        {label}
      </text>
    </svg>
  );
}

/** Bare glyph, sized by className like any icon. */
export function FileIcon({
  type,
  name,
  className = "h-6 w-6",
}: {
  type: DriveItemType;
  name: string;
  className?: string;
}) {
  return type === "folder" ? (
    <FolderGlyph className={className} />
  ) : (
    <FileGlyph name={name} className={className} />
  );
}

/**
 * The glyph at the two sizes the explorer uses. No background tile — the
 * paper sheet and folder carry their own shape — but the box keeps every row
 * and card aligned regardless of glyph proportions.
 */
export function FileTile({
  type,
  name,
  size = "sm",
}: {
  type: DriveItemType;
  name: string;
  size?: "sm" | "lg";
}) {
  const box = size === "lg" ? "h-12 w-12" : "h-8 w-8";
  const glyph =
    type === "folder"
      ? size === "lg"
        ? "h-[38px] w-[44px]"
        : "h-[26px] w-[30px]"
      : size === "lg"
        ? "h-[46px] w-[39px]"
        : "h-[30px] w-[26px]";

  return (
    <div className={`${box} flex shrink-0 items-center justify-center`}>
      <FileIcon type={type} name={name} className={glyph} />
    </div>
  );
}
