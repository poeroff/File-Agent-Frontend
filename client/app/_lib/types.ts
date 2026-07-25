export type DriveItemType = "folder" | "file";

export interface DriveItem {
  id: string;
  name: string;
  type: DriveItemType;
  parentId: string | null;
  size?: number;
  mimeType?: string;
  modifiedAt: number;
  starred: boolean;
  trashed: boolean;
}

export type ViewMode = "grid" | "list";

export type SortKey = "name" | "size" | "modified";

export interface Sort {
  key: SortKey;
  dir: "asc" | "desc";
}

export type ActiveView = "my-drive" | "recent" | "starred" | "trash";

export type UploadStatus = "uploading" | "done" | "error";

export interface UploadTask {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: UploadStatus;
  /** Human-readable reason shown in the tray when status is "error". */
  error?: string;
}

// A non-upload background operation (move to trash, restore, delete, …) shown
// in the bottom-right activity tray.
export interface Activity {
  id: string;
  label: string;
  status: "running" | "done" | "error";
}
