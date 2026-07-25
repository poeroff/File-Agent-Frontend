import {
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  type LucideIcon,
  File as FileGeneric,
} from "lucide-react";

/**
 * Files are grouped into a handful of categories. One category drives three
 * things at once — the icon, its tint in the explorer, and the colour of that
 * slice in the sidebar storage gauge — so a file type looks the same wherever
 * it shows up.
 */
export type FileCategory =
  | "image"
  | "document"
  | "sheet"
  | "video"
  | "audio"
  | "code"
  | "archive"
  | "other";

export interface CategoryStyle {
  /** Label shown in the storage legend. */
  label: string;
  icon: LucideIcon;
  /** Icon colour. */
  text: string;
  /** Tinted tile the icon sits on. */
  tile: string;
  /** Solid fill for storage gauge segments. */
  bar: string;
}

const CATEGORY_BY_EXTENSION: Record<string, FileCategory> = {
  pdf: "document",
  doc: "document",
  docx: "document",
  txt: "document",
  md: "document",
  rtf: "document",
  hwp: "document",
  ppt: "document",
  pptx: "document",
  xls: "sheet",
  xlsx: "sheet",
  csv: "sheet",
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  svg: "image",
  webp: "image",
  avif: "image",
  heic: "image",
  mp4: "video",
  mov: "video",
  webm: "video",
  mkv: "video",
  avi: "video",
  mp3: "audio",
  wav: "audio",
  flac: "audio",
  m4a: "audio",
  zip: "archive",
  rar: "archive",
  "7z": "archive",
  tar: "archive",
  gz: "archive",
  ts: "code",
  tsx: "code",
  js: "code",
  jsx: "code",
  json: "code",
  py: "code",
  java: "code",
  go: "code",
  rs: "code",
  sh: "code",
  css: "code",
  html: "code",
  yml: "code",
  yaml: "code",
};

export const CATEGORY_STYLES: Record<FileCategory, CategoryStyle> = {
  image: {
    label: "이미지",
    icon: FileImage,
    text: "text-violet-500",
    tile: "bg-violet-500/10",
    bar: "bg-violet-500",
  },
  document: {
    label: "문서",
    icon: FileText,
    text: "text-sky-500",
    tile: "bg-sky-500/10",
    bar: "bg-sky-500",
  },
  sheet: {
    label: "스프레드시트",
    icon: FileSpreadsheet,
    text: "text-green-600",
    tile: "bg-green-600/10",
    bar: "bg-green-600",
  },
  video: {
    label: "동영상",
    icon: FileVideo,
    text: "text-rose-500",
    tile: "bg-rose-500/10",
    bar: "bg-rose-500",
  },
  audio: {
    label: "오디오",
    icon: FileAudio,
    text: "text-pink-500",
    tile: "bg-pink-500/10",
    bar: "bg-pink-500",
  },
  code: {
    label: "코드",
    icon: FileCode,
    text: "text-indigo-400",
    tile: "bg-indigo-400/10",
    bar: "bg-indigo-400",
  },
  archive: {
    label: "압축 파일",
    icon: FileArchive,
    text: "text-orange-500",
    tile: "bg-orange-500/10",
    bar: "bg-orange-500",
  },
  other: {
    label: "기타",
    icon: FileGeneric,
    text: "text-faint",
    tile: "bg-line/60",
    bar: "bg-line-strong",
  },
};

/** Category order used by the storage gauge, largest-typical first. */
export const CATEGORY_ORDER: FileCategory[] = [
  "image",
  "video",
  "audio",
  "document",
  "sheet",
  "code",
  "archive",
  "other",
];

export function extensionOf(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx <= 0 ? "" : name.slice(idx + 1).toLowerCase();
}

export function categoryOf(name: string): FileCategory {
  return CATEGORY_BY_EXTENSION[extensionOf(name)] ?? "other";
}

export function styleForFile(name: string): CategoryStyle {
  return CATEGORY_STYLES[categoryOf(name)];
}

export function iconForFile(name: string): LucideIcon {
  return styleForFile(name).icon;
}

export function colorForFile(name: string): string {
  return styleForFile(name).text;
}
