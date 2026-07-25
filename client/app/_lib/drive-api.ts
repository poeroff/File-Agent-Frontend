import type { DriveItem } from "@/app/_lib/types";

// Client-side calls to our own same-origin /api/drive/* route handlers, which
// attach the backend token server-side. The browser never sees the token.

async function postJson(path: string, body?: unknown): Promise<void> {
  const res = await fetch(path, {
    method: "POST",
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok)
    throw new Error(`Request to ${path} failed (status ${res.status})`);
}

export async function listItems(): Promise<DriveItem[]> {
  const res = await fetch("/api/drive", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to list drive contents");
  return res.json();
}

export function createFolderApi(path: string, name: string): Promise<void> {
  return postJson("/api/drive/folder", { path, name });
}

// Files larger than one part are uploaded in chunks (S3 multipart): each part
// is PUT straight to S3 with its own retry, so a blip only re-sends that part,
// not the whole file — and we can report real progress.
const BASE_PART_SIZE = 10 * 1024 * 1024;
// S3's own limits: parts (except the last) must be ≥5MB, and there can be at
// most 10,000 of them.
const MAX_PART_COUNT = 10000;
// Well under the 10,000 ceiling on purpose. Part count drives how many URLs we
// sign, how many requests we make, and how much work a single retry redoes, so
// bigger files get bigger parts instead of more of them: a 20GB file becomes
// ~1000×21MB parts rather than 2048×10MB.
const TARGET_PART_COUNT = 1000;
const MAX_PART_SIZE = 512 * 1024 * 1024;
// How many part URLs to sign per round trip. Small enough that the response
// stays a few tens of KB and each URL is signed shortly before it's used.
const PRESIGN_WINDOW = 100;
// Parts in flight per file. Measured on a ~22MB/s uplink, 3 and 8 performed
// identically (the link saturates either way), so this stays low: it's enough
// to hide per-request latency without multiplying memory or retry cost. Raising
// it wouldn't buy much anyway — S3 is HTTP/1.1, so the browser caps concurrent
// connections to one host at ~6 across all files being uploaded.
const PART_CONCURRENCY = 4;

// A part gets ~25s of retries spread over 6 attempts. The old 3×400ms gave up
// after 2.4s, which is shorter than an ordinary Wi-Fi hiccup — and losing one
// part loses the whole file, so a multi-hour upload needs to ride out a blip.
const PART_ATTEMPTS = 6;
const RETRY_BASE_MS = 1000;
const RETRY_CAP_MS = 8000;

export type UploadProgress = (percent: number) => void;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Exponential backoff with jitter, so parallel parts don't retry in lockstep. */
function retryDelay(attempt: number): number {
  const base = Math.min(RETRY_BASE_MS * 2 ** (attempt - 1), RETRY_CAP_MS);
  return base + Math.random() * 250;
}

export async function uploadFileApi(
  path: string,
  name: string,
  file: File,
  onProgress?: UploadProgress,
): Promise<void> {
  if (file.size > BASE_PART_SIZE) {
    return multipartUpload(path, name, file, onProgress);
  }
  return singlePutUpload(path, name, file, onProgress);
}

/** Part size for a file: 10MB until that would need more than ~1000 parts. */
function partSizeFor(size: number): number {
  if (size <= BASE_PART_SIZE * TARGET_PART_COUNT) return BASE_PART_SIZE;
  const mb = 1024 * 1024;
  const scaled = Math.ceil(size / TARGET_PART_COUNT / mb) * mb;
  return Math.min(scaled, MAX_PART_SIZE);
}

async function singlePutUpload(
  path: string,
  name: string,
  file: File,
  onProgress?: UploadProgress,
): Promise<void> {
  const contentType = file.type || "application/octet-stream";
  const attempts = PART_ATTEMPTS;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const res = await fetch("/api/drive/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, name }),
      });
      if (!res.ok) throw new Error(`Upload failed (status ${res.status})`);
      const { url } = (await res.json()) as { url: string };

      const put = await fetch(url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": contentType },
      });
      if (!put.ok) throw new Error(`Upload failed (status ${put.status})`);
      onProgress?.(100);
      return;
    } catch (error) {
      if (attempt === attempts) throw error;
      await sleep(retryDelay(attempt));
    }
  }
}

/**
 * Signs part URLs a window at a time and hands them out on demand.
 *
 * Signing every part up front means a 20GB upload asks for ~1000 URLs before
 * sending a byte, and — worse — all of them start expiring together, so a slow
 * connection hits `403 Request has expired` partway through and can't finish.
 * Windows keep each URL young, and `refresh` re-signs one when it does expire.
 */
function createPartUrls(key: string, uploadId: string, partCount: number) {
  const urls = new Map<number, string>();
  const inFlight = new Map<number, Promise<void>>();
  const windowStart = (part: number) =>
    Math.floor((part - 1) / PRESIGN_WINDOW) * PRESIGN_WINDOW + 1;

  async function signWindow(firstPart: number): Promise<void> {
    const parts = Math.min(PRESIGN_WINDOW, partCount - firstPart + 1);
    const res = await fetch("/api/drive/multipart/urls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, uploadId, parts, firstPart }),
    });
    if (!res.ok) throw new Error(`Upload failed (status ${res.status})`);
    const { urls: signed } = (await res.json()) as { urls: string[] };
    signed.forEach((url, index) => urls.set(firstPart + index, url));
  }

  // One request per window even when several workers reach it at once.
  function ensureWindow(firstPart: number): Promise<void> {
    let pending = inFlight.get(firstPart);
    if (!pending) {
      pending = signWindow(firstPart).finally(() => inFlight.delete(firstPart));
      inFlight.set(firstPart, pending);
    }
    return pending;
  }

  async function get(part: number): Promise<string> {
    const cached = urls.get(part);
    if (cached) return cached;
    await ensureWindow(windowStart(part));
    const url = urls.get(part);
    if (!url) throw new Error(`No upload URL for part ${part}`);
    return url;
  }

  return {
    get,
    /** Drops a stale window's URLs so the next `get` signs fresh ones. */
    async refresh(part: number): Promise<void> {
      const first = windowStart(part);
      for (let p = first; p < first + PRESIGN_WINDOW; p += 1) urls.delete(p);
      await ensureWindow(first);
    },
  };
}

type PartUrls = ReturnType<typeof createPartUrls>;

async function putPart(
  partUrls: PartUrls,
  partNumber: number,
  blob: Blob,
): Promise<string> {
  const attempts = PART_ATTEMPTS;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      // Inside the retry on purpose: signing can fail on a flaky network too,
      // and a failed part is worth re-signing rather than abandoning.
      const url = await partUrls.get(partNumber);
      const res = await fetch(url, { method: "PUT", body: blob });
      if (res.status === 403) {
        // On a long upload this is virtually always an expired signature, and
        // it's recoverable: re-sign the window and retry instead of failing
        // the whole file after hours of transfer.
        await partUrls.refresh(partNumber);
        throw new Error("Part URL expired");
      }
      if (!res.ok) throw new Error(`Part upload failed (status ${res.status})`);
      const etag = res.headers.get("ETag") ?? res.headers.get("etag");
      if (!etag) throw new Error("Missing ETag on part response");
      return etag;
    } catch (error) {
      if (attempt === attempts) throw error;
      await sleep(retryDelay(attempt));
    }
  }
  throw new Error("unreachable");
}

async function multipartUpload(
  path: string,
  name: string,
  file: File,
  onProgress?: UploadProgress,
): Promise<void> {
  const partSize = partSizeFor(file.size);
  const partCount = Math.ceil(file.size / partSize);
  if (partCount > MAX_PART_COUNT) {
    // Only reachable past ~5TB (10,000 × the 512MB part cap).
    throw new Error("File exceeds the maximum upload size");
  }

  const created = await fetch("/api/drive/multipart/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // Multipart can only set the type here — the parts can't — so without this
    // the finished object is stored as binary/octet-stream and the browser
    // won't preview large PDFs, images or videos inline.
    body: JSON.stringify({
      path,
      name,
      contentType: file.type || "application/octet-stream",
    }),
  });
  if (!created.ok) throw new Error(`Upload failed (status ${created.status})`);
  const { uploadId, key } = (await created.json()) as {
    uploadId: string;
    key: string;
  };

  try {
    const partUrls = createPartUrls(key, uploadId, partCount);
    const parts: { partNumber: number; etag: string }[] = new Array(partCount);
    let uploadedBytes = 0;
    let nextPart = 0;

    const worker = async () => {
      while (nextPart < partCount) {
        const i = nextPart++;
        const start = i * partSize;
        const end = Math.min(start + partSize, file.size);
        const etag = await putPart(partUrls, i + 1, file.slice(start, end));
        parts[i] = { partNumber: i + 1, etag };
        uploadedBytes += end - start;
        onProgress?.(Math.round((uploadedBytes / file.size) * 100));
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(PART_CONCURRENCY, partCount) }, worker),
    );

    const done = await fetch("/api/drive/multipart/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, uploadId, parts }),
    });
    if (!done.ok) throw new Error(`Upload failed (status ${done.status})`);
    onProgress?.(100);
  } catch (error) {
    // Free the orphaned parts so they don't linger + incur storage cost.
    void fetch("/api/drive/multipart/abort", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, uploadId }),
    }).catch(() => {});
    throw error;
  }
}

// Presigned URL: attachment by default, inline for previewing images/PDFs/….
async function presignedUrl(key: string, inline: boolean): Promise<string> {
  const res = await fetch(
    `/api/drive/download?key=${encodeURIComponent(key)}${inline ? "&inline=1" : ""}`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error("Failed to get download URL");
  const { url } = (await res.json()) as { url: string };
  return url;
}

export const getDownloadUrl = (key: string) => presignedUrl(key, false);
export const getPreviewUrl = (key: string) => presignedUrl(key, true);

export async function listTrashApi(): Promise<DriveItem[]> {
  const res = await fetch("/api/drive/trash", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to list trash");
  return res.json();
}

export function moveToTrashApi(paths: string[]): Promise<void> {
  return postJson("/api/drive/trash", { paths });
}

export function restoreApi(entryIds: string[]): Promise<void> {
  return postJson("/api/drive/restore", { entryIds });
}

export function deleteTrashApi(entryIds: string[]): Promise<void> {
  return postJson("/api/drive/trash/delete", { entryIds });
}

export function emptyTrashApi(): Promise<void> {
  return postJson("/api/drive/trash/empty");
}
