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

const EXTENSION_MAP: Record<string, LucideIcon> = {
  pdf: FileText,
  doc: FileText,
  docx: FileText,
  txt: FileText,
  md: FileText,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  csv: FileSpreadsheet,
  png: FileImage,
  jpg: FileImage,
  jpeg: FileImage,
  gif: FileImage,
  svg: FileImage,
  webp: FileImage,
  mp4: FileVideo,
  mov: FileVideo,
  webm: FileVideo,
  mp3: FileAudio,
  wav: FileAudio,
  zip: FileArchive,
  rar: FileArchive,
  "7z": FileArchive,
  ts: FileCode,
  tsx: FileCode,
  js: FileCode,
  jsx: FileCode,
  json: FileCode,
  py: FileCode,
  java: FileCode,
};

const COLOR_MAP: Record<string, string> = {
  pdf: "text-red-500",
  doc: "text-blue-500",
  docx: "text-blue-500",
  txt: "text-zinc-500",
  md: "text-zinc-500",
  xls: "text-emerald-600",
  xlsx: "text-emerald-600",
  csv: "text-emerald-600",
  png: "text-purple-500",
  jpg: "text-purple-500",
  jpeg: "text-purple-500",
  gif: "text-purple-500",
  svg: "text-purple-500",
  webp: "text-purple-500",
  mp4: "text-orange-500",
  mov: "text-orange-500",
  webm: "text-orange-500",
  mp3: "text-pink-500",
  wav: "text-pink-500",
  zip: "text-amber-600",
  rar: "text-amber-600",
  "7z": "text-amber-600",
  ts: "text-sky-600",
  tsx: "text-sky-600",
  js: "text-yellow-500",
  jsx: "text-yellow-500",
  json: "text-yellow-600",
  py: "text-blue-600",
  java: "text-orange-600",
};

function extensionOf(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx === -1 ? "" : name.slice(idx + 1).toLowerCase();
}

export function iconForFile(name: string): LucideIcon {
  return EXTENSION_MAP[extensionOf(name)] ?? FileGeneric;
}

export function colorForFile(name: string): string {
  return COLOR_MAP[extensionOf(name)] ?? "text-zinc-400";
}
