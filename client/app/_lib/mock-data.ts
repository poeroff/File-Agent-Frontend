import type { DriveItem } from "@/app/_lib/types";

const DAY = 86_400_000;
// Fixed reference point (not Date.now()) so seed timestamps are identical on
// server and client — using the real current time here caused a hydration
// mismatch, since the server and client evaluate this module at different moments.
const now = Date.UTC(2026, 6, 24, 9, 0, 0);

export const initialItems: DriveItem[] = [
  {
    id: "folder-designs",
    name: "Designs",
    type: "folder",
    parentId: null,
    modifiedAt: now - 1 * DAY,
    starred: true,
    trashed: false,
  },
  {
    id: "folder-contracts",
    name: "Contracts",
    type: "folder",
    parentId: null,
    modifiedAt: now - 3 * DAY,
    starred: false,
    trashed: false,
  },
  {
    id: "folder-photos",
    name: "Photos",
    type: "folder",
    parentId: null,
    modifiedAt: now - 5 * DAY,
    starred: false,
    trashed: false,
  },
  {
    id: "file-roadmap",
    name: "Product Roadmap.pdf",
    type: "file",
    parentId: null,
    size: 2_400_000,
    mimeType: "application/pdf",
    modifiedAt: now - 2 * 3600_000,
    starred: true,
    trashed: false,
  },
  {
    id: "file-budget",
    name: "Q3 Budget.xlsx",
    type: "file",
    parentId: null,
    size: 540_000,
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    modifiedAt: now - 6 * 3600_000,
    starred: false,
    trashed: false,
  },
  {
    id: "file-notes",
    name: "Meeting Notes.txt",
    type: "file",
    parentId: null,
    size: 8_200,
    mimeType: "text/plain",
    modifiedAt: now - 30 * 60_000,
    starred: false,
    trashed: false,
  },
  {
    id: "file-logo",
    name: "logo-final.svg",
    type: "file",
    parentId: "folder-designs",
    size: 12_000,
    mimeType: "image/svg+xml",
    modifiedAt: now - 1 * DAY,
    starred: false,
    trashed: false,
  },
  {
    id: "file-mockup",
    name: "homepage-mockup.png",
    type: "file",
    parentId: "folder-designs",
    size: 3_100_000,
    mimeType: "image/png",
    modifiedAt: now - 1 * DAY,
    starred: false,
    trashed: false,
  },
  {
    id: "file-nda",
    name: "NDA-signed.pdf",
    type: "file",
    parentId: "folder-contracts",
    size: 190_000,
    mimeType: "application/pdf",
    modifiedAt: now - 3 * DAY,
    starred: false,
    trashed: false,
  },
  {
    id: "file-old-draft",
    name: "old-draft.docx",
    type: "file",
    parentId: null,
    size: 45_000,
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    modifiedAt: now - 10 * DAY,
    starred: false,
    trashed: true,
  },
];

export const STORAGE_QUOTA_BYTES = 15 * 1024 ** 3;
