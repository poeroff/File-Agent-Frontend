import { Folder } from "lucide-react";
import { colorForFile, iconForFile, styleForFile } from "@/app/_lib/file-icon";
import type { DriveItemType } from "@/app/_lib/types";

/** Bare glyph. Folders are kraft (a filing-cabinet ochre); files take their category tint. */
export function FileIcon({
  type,
  name,
  className = "h-6 w-6",
}: {
  type: DriveItemType;
  name: string;
  className?: string;
}) {
  if (type === "folder") {
    return <Folder className={`${className} fill-kraft/25 text-kraft`} />;
  }
  const Icon = iconForFile(name);
  // eslint-disable-next-line react-hooks/static-components -- icon is looked up from a static map, not created here
  return <Icon className={`${className} ${colorForFile(name)}`} strokeWidth={1.75} />;
}

/**
 * The glyph on a tinted tile, used in the grid and list so every row has the
 * same optical weight regardless of icon shape.
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
  const tile = type === "folder" ? "bg-kraft-soft" : styleForFile(name).tile;
  const box = size === "lg" ? "h-11 w-11 rounded-xl" : "h-8 w-8 rounded-lg";
  const glyph = size === "lg" ? "h-[22px] w-[22px]" : "h-[17px] w-[17px]";

  return (
    <div
      className={`${box} ${tile} flex shrink-0 items-center justify-center transition-colors`}
    >
      <FileIcon type={type} name={name} className={glyph} />
    </div>
  );
}
