import { Folder } from "lucide-react";
import { colorForFile, iconForFile } from "@/app/_lib/file-icon";
import type { DriveItemType } from "@/app/_lib/types";

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
    return <Folder className={`${className} text-blue-400`} />;
  }
  const Icon = iconForFile(name);
  // eslint-disable-next-line react-hooks/static-components -- icon is looked up from a static map, not created here
  return <Icon className={`${className} ${colorForFile(name)}`} />;
}
