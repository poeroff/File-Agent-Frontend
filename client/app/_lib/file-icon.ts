/**
 * Files are grouped into a handful of categories. One category drives three
 * things at once — the colour of the file's printed extension label, its
 * glyph in the explorer, and the colour of that slice in the sidebar storage
 * gauge — so a file type looks the same wherever it shows up.
 *
 * Colours are ink tones: saturated enough to print white type on, muted
 * enough to sit on paper. They are plain hex (not Tailwind classes) because
 * the glyphs are our own SVG and the gauge sets them inline.
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
  /** Ink colour for the extension label chip and gauge slice. */
  color: string;
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
  bmp: "image",
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
  image: { label: "이미지", color: "#8a4bb0" },
  document: { label: "문서", color: "#2f7da2" },
  sheet: { label: "스프레드시트", color: "#2f8a5b" },
  video: { label: "동영상", color: "#bf5a2c" },
  audio: { label: "오디오", color: "#b8487d" },
  code: { label: "코드", color: "#5a5fbf" },
  archive: { label: "압축 파일", color: "#8f6c12" },
  other: { label: "기타", color: "#75808a" },
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

/**
 * What gets printed on the file's label chip: the extension in caps, cut to
 * the 4 characters a small label can hold ("JPEG", "DOCX", "7Z").
 */
export function labelForFile(name: string): string {
  const ext = extensionOf(name);
  return (ext || "FILE").slice(0, 4).toUpperCase();
}
