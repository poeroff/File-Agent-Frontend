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

export type ActiveView = "my-drive" | "recent" | "starred" | "trash";

export type UploadStatus = "uploading" | "done" | "error";

export interface UploadTask {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: UploadStatus;
}
