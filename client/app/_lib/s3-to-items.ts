import type { DriveItem } from "@/app/_lib/types";

export interface S3Object {
  /** Key relative to the user's folder, e.g. "Photos/pic.jpg" or "Photos/". */
  key: string;
  size: number;
  lastModified: number;
}

export interface TrashEntry {
  entryId: string;
  originalPath: string;
  name: string;
  type: "file" | "folder";
  size: number;
  lastModified: number;
}

// Each trash entry is one top-level unit the user trashed. We give it an id of
// `trash:{entryId}` (kept distinct from live-item ids) and flag it trashed so
// the existing trash view picks it up.
export function trashEntriesToItems(entries: TrashEntry[]): DriveItem[] {
  return entries.map((entry) => ({
    id: `trash:${entry.entryId}`,
    name: entry.name,
    type: entry.type,
    parentId: null,
    size: entry.type === "file" ? entry.size : undefined,
    modifiedAt: entry.lastModified,
    starred: false,
    trashed: true,
  }));
}

/**
 * S3 is a flat key/value store, so folders only exist implicitly as key
 * prefixes. This turns the flat object list into the folder tree the UI
 * expects (DriveItem[] with parentId links), synthesizing a folder item for
 * every prefix segment. Each item's id is its full relative path, which keeps
 * parent/child links consistent.
 */
export function s3ObjectsToItems(
  objects: S3Object[],
  fetchedAt: number,
): DriveItem[] {
  const items = new Map<string, DriveItem>();

  function ensureFolder(prefix: string) {
    if (!prefix || items.has(prefix)) return;
    const parts = prefix.split("/");
    const name = parts[parts.length - 1];
    const parentPrefix = parts.slice(0, -1).join("/");
    if (parentPrefix) ensureFolder(parentPrefix);
    items.set(prefix, {
      id: prefix,
      name,
      type: "folder",
      parentId: parentPrefix || null,
      modifiedAt: fetchedAt,
      starred: false,
      trashed: false,
    });
  }

  for (const obj of objects) {
    if (!obj.key) continue;

    // A key ending in "/" is an explicit (empty) folder marker.
    if (obj.key.endsWith("/")) {
      ensureFolder(obj.key.slice(0, -1));
      continue;
    }

    const parts = obj.key.split("/");
    const name = parts.pop() as string;
    const parentPrefix = parts.join("/");
    if (parentPrefix) ensureFolder(parentPrefix);

    items.set(obj.key, {
      id: obj.key,
      name,
      type: "file",
      parentId: parentPrefix || null,
      size: obj.size,
      modifiedAt: obj.lastModified,
      starred: false,
      trashed: false,
    });
  }

  return Array.from(items.values());
}
