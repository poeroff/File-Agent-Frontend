import type { DriveItem } from "@/app/_lib/types";

// Client-side calls to our own same-origin /api/drive/* route handlers, which
// attach the backend token server-side. The browser never sees the token.

// Which drive an API call targets: the caller's own, or the shared one every
// signed-in user sees. Omitted = personal, so existing callers stay unchanged.
export type DriveScope = "shared" | undefined;

const withDrive = (body: Record<string, unknown>, drive: DriveScope) =>
  drive ? { ...body, drive } : body;

/** The one JSON-POST helper: throws on non-2xx, returns the parsed body. */
async function postDrive(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<unknown> {
  const res = await fetch(path, {
    method: "POST",
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  if (!res.ok)
    throw new Error(`Request to ${path} failed (status ${res.status})`);
  return res.json().catch(() => undefined);
}

export async function listItems(drive?: DriveScope): Promise<DriveItem[]> {
  const res = await fetch(`/api/drive${drive ? "?drive=shared" : ""}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to list drive contents");
  return res.json();
}

export async function createFolderApi(
  path: string,
  name: string,
  drive?: DriveScope,
): Promise<void> {
  await postDrive("/api/drive/folder", withDrive({ path, name }, drive));
}

// Files larger than one part are uploaded in chunks (S3 multipart): each part
// is PUT straight to S3 with its own retry, so a blip only re-sends that part,
// not the whole file — and we can report real progress.
// 32MB (not the old 10): every request rides through Cloudflare now, so fewer,
// fatter parts spend less time on per-request overhead. Still well under the
// 100MB request-body limit, and a retry re-sends at most 32MB.
const BASE_PART_SIZE = 32 * 1024 * 1024;
// S3's own limits: parts (except the last) must be ≥5MB, and there can be at
// most 10,000 of them.
const MAX_PART_COUNT = 10000;
// Well under the 10,000 ceiling on purpose. Part count drives how many URLs we
// sign, how many requests we make, and how much work a single retry redoes, so
// bigger files get bigger parts instead of more of them: a 20GB file becomes
// ~1000×21MB parts rather than 2048×10MB.
const TARGET_PART_COUNT = 1000;
// Just under Cloudflare's 100MB request-body limit — uploads route through
// the Cloudflare tunnel, and a bigger part gets a 413 there. 95MB (not a
// flush 100) leaves margin at the boundary, and with the 10,000-part ceiling
// allows single files up to ~950GB.
const MAX_PART_SIZE = 95 * 1024 * 1024;
// How many part URLs to sign per round trip. Small enough that the response
// stays a few tens of KB and each URL is signed shortly before it's used.
const PRESIGN_WINDOW = 100;
// Parts in flight per file. Measured on a ~22MB/s uplink, 3 and 8 performed
// identically (the link saturates either way), so this stays low: it's enough
// to hide per-request latency without multiplying memory or retry cost. Raising
// it wouldn't buy much anyway — S3 is HTTP/1.1, so the browser caps concurrent
// connections to one host at ~6 across all files being uploaded.
const PART_CONCURRENCY = 6;

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
  signal?: AbortSignal,
  drive?: DriveScope,
): Promise<void> {
  if (file.size > BASE_PART_SIZE) {
    return multipartUpload(path, name, file, onProgress, signal, drive);
  }
  return singlePutUpload(path, name, file, onProgress, signal, drive);
}

/** Part size for a file: 10MB until that would need more than ~1000 parts. */
function partSizeFor(size: number): number {
  if (size <= BASE_PART_SIZE * TARGET_PART_COUNT) return BASE_PART_SIZE;
  const mb = 1024 * 1024;
  const scaled = Math.ceil(size / TARGET_PART_COUNT / mb) * mb;
  return Math.min(scaled, MAX_PART_SIZE);
}

/** A user-initiated cancellation (aborted fetch), not a failure to retry. */
function isAbortError(error: unknown): boolean {
  return (error as { name?: string } | null)?.name === "AbortError";
}

/** Retries `attempt`, a whole request, with the shared backoff. */
async function withRetry<T>(attempt: () => Promise<T>): Promise<T> {
  for (let n = 1; ; n += 1) {
    try {
      return await attempt();
    } catch (error) {
      // A cancelled upload must stop at once, not retry for another ~25s.
      if (isAbortError(error) || n >= PART_ATTEMPTS) throw error;
      await sleep(retryDelay(n));
    }
  }
}

// ---- Request coalescing ----------------------------------------------------
// Uploading many small files is bound by round trips, not bytes: each file
// needs a sign before its PUT and a completion after. Callers that arrive
// within the same short window are merged into one batched backend call, so a
// 6-wide upload pool costs ~2 API calls per wave instead of 12.

/**
 * Wraps a batch API into a per-item call: items enqueued within `delayMs` (per
 * drive) are flushed together, and `run` must return results in input order.
 */
function coalesce<Item, Result>(
  run: (items: Item[], drive: DriveScope) => Promise<Result[]>,
  delayMs = 10,
) {
  type Queue = {
    items: Item[];
    settlers: { resolve: (r: Result) => void; reject: (e: unknown) => void }[];
  };
  const queues = new Map<string, Queue>();

  return (item: Item, drive: DriveScope): Promise<Result> =>
    new Promise((resolve, reject) => {
      const key = drive ?? "";
      let queue = queues.get(key);
      if (!queue) {
        queue = { items: [], settlers: [] };
        queues.set(key, queue);
        const flush = queue;
        setTimeout(() => {
          queues.delete(key);
          run(flush.items, drive).then(
            (results) =>
              flush.settlers.forEach((s, i) => s.resolve(results[i])),
            (error) => flush.settlers.forEach((s) => s.reject(error)),
          );
        }, delayMs);
      }
      queue.items.push(item);
      queue.settlers.push({ resolve, reject });
    });
}

/** Reserves an upload slot + PUT URL, batched across concurrent callers. */
const reserveUpload = coalesce(
  async (
    files: { path: string; name: string; contentType: string }[],
    drive: DriveScope,
  ) => {
    const { files: reserved } = (await postDrive(
      "/api/drive/upload-urls",
      withDrive({ files }, drive),
    )) as { files: { url: string; key: string; path: string }[] };
    return reserved;
  },
);

/** Marks an upload finished, batched across concurrent callers. */
const completeUpload = coalesce(async (keys: string[], drive: DriveScope) => {
  await postDrive("/api/drive/upload/complete-batch", withDrive({ keys }, drive));
  return keys.map(() => undefined);
});

/**
 * A PUT via XMLHttpRequest instead of fetch, because only XHR reports upload
 * progress *during* a request (`upload.onprogress`) — fetch can't, so a large
 * chunk would otherwise sit at 0% until it finished. Resolves with the HTTP
 * status and a header reader; rejects with an AbortError when `signal` fires so
 * the retry logic treats a cancellation as a cancel, not a failure to retry.
 */
function xhrPut(
  url: string,
  body: Blob,
  opts: {
    signal?: AbortSignal;
    contentType?: string;
    onProgress?: (loaded: number) => void;
  } = {},
): Promise<{ status: number; header: (name: string) => string | null }> {
  return new Promise((resolve, reject) => {
    if (opts.signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    if (opts.contentType) xhr.setRequestHeader("Content-Type", opts.contentType);

    const onAbort = () => xhr.abort();
    opts.signal?.addEventListener("abort", onAbort, { once: true });
    const cleanup = () => opts.signal?.removeEventListener("abort", onAbort);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) opts.onProgress?.(event.loaded);
    };
    xhr.onload = () => {
      cleanup();
      resolve({ status: xhr.status, header: (n) => xhr.getResponseHeader(n) });
    };
    xhr.onerror = () => {
      cleanup();
      reject(new Error("Network error during upload"));
    };
    xhr.onabort = () => {
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    };
    xhr.send(body);
  });
}

/**
 * Uploads a small file in one PUT.
 *
 * The three steps are separate on purpose: the server reserves the file's spot
 * (and returns the blob to write to) *once*, so retrying a failed transfer
 * re-sends the bytes instead of reserving a second spot under a "name (1)".
 * The final call is what tells the server the bytes arrived — it never sees
 * them, since they go straight to S3.
 */
async function singlePutUpload(
  path: string,
  name: string,
  file: File,
  onProgress?: UploadProgress,
  signal?: AbortSignal,
  drive?: DriveScope,
): Promise<void> {
  const contentType = file.type || "application/octet-stream";
  // Coalesced: concurrent uploads share one batched sign request. No signal —
  // the call is small and shared with other files, and an abort right after
  // signing is still cleaned up by the abort call below.
  const { url, key } = await withRetry(() =>
    reserveUpload({ path, name, contentType }, drive),
  );

  try {
    await withRetry(async () => {
      const res = await xhrPut(url, file, {
        signal,
        contentType,
        onProgress: (loaded) =>
          onProgress?.(
            file.size > 0 ? Math.round((loaded / file.size) * 100) : 100,
          ),
      });
      if (res.status < 200 || res.status >= 300) {
        throw new Error(`Upload failed (status ${res.status})`);
      }
    });
  } catch (error) {
    // Release the reserved name and blob so a failed or cancelled upload leaves
    // nothing behind (no signal here, so the cleanup runs even after an abort).
    void postDrive("/api/drive/upload/abort", withDrive({ key }, drive)).catch(
      () => {},
    );
    throw error;
  }

  await withRetry(() => completeUpload(key, drive));
  onProgress?.(100);
}

/** Renames a file or folder. Folders keep their contents. */
export async function renameApi(
  path: string,
  name: string,
  drive?: DriveScope,
): Promise<void> {
  await postDrive("/api/drive/rename", withDrive({ path, name }, drive));
}

/**
 * Signs part URLs a window at a time and hands them out on demand.
 *
 * Signing every part up front means a 20GB upload asks for ~1000 URLs before
 * sending a byte, and — worse — all of them start expiring together, so a slow
 * connection hits `403 Request has expired` partway through and can't finish.
 * Windows keep each URL young, and `refresh` re-signs one when it does expire.
 */
function createPartUrls(
  key: string,
  uploadId: string,
  partCount: number,
  signal?: AbortSignal,
  drive?: DriveScope,
) {
  const urls = new Map<number, string>();
  const inFlight = new Map<number, Promise<void>>();
  const windowStart = (part: number) =>
    Math.floor((part - 1) / PRESIGN_WINDOW) * PRESIGN_WINDOW + 1;

  async function signWindow(firstPart: number): Promise<void> {
    const parts = Math.min(PRESIGN_WINDOW, partCount - firstPart + 1);
    const { urls: signed } = (await postDrive(
      "/api/drive/multipart/urls",
      withDrive({ key, uploadId, parts, firstPart }, drive),
      signal,
    )) as { urls: string[] };
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

function putPart(
  partUrls: PartUrls,
  partNumber: number,
  blob: Blob,
  signal?: AbortSignal,
  onProgress?: (loaded: number) => void,
): Promise<string> {
  return withRetry(async () => {
    // Inside the retry on purpose: signing can fail on a flaky network too,
    // and a failed part is worth re-signing rather than abandoning.
    const url = await partUrls.get(partNumber);
    const res = await xhrPut(url, blob, { signal, onProgress });
    if (res.status === 403) {
      // On a long upload this is virtually always an expired signature, and
      // it's recoverable: re-sign the window and retry instead of failing
      // the whole file after hours of transfer.
      await partUrls.refresh(partNumber);
      throw new Error("Part URL expired");
    }
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`Part upload failed (status ${res.status})`);
    }
    const etag = res.header("ETag") ?? res.header("etag");
    if (!etag) throw new Error("Missing ETag on part response");
    return etag;
  });
}

async function multipartUpload(
  path: string,
  name: string,
  file: File,
  onProgress?: UploadProgress,
  signal?: AbortSignal,
  drive?: DriveScope,
): Promise<void> {
  const partSize = partSizeFor(file.size);
  const partCount = Math.ceil(file.size / partSize);
  if (partCount > MAX_PART_COUNT) {
    // Only reachable past ~5TB (10,000 × the 512MB part cap).
    throw new Error("File exceeds the maximum upload size");
  }

  // Multipart can only set the type here — the parts can't — so without this
  // the finished object is stored as binary/octet-stream and the browser
  // won't preview large PDFs, images or videos inline.
  // Retried like everything else: a transient failure here (e.g. the Vercel →
  // backend DNS blips) used to fail the whole file before a byte was sent.
  const { uploadId, key } = (await withRetry(() =>
    postDrive(
      "/api/drive/multipart/create",
      withDrive(
        { path, name, contentType: file.type || "application/octet-stream" },
        drive,
      ),
      signal,
    ),
  )) as { uploadId: string; key: string };

  try {
    const partUrls = createPartUrls(key, uploadId, partCount, signal, drive);
    const parts: { partNumber: number; etag: string }[] = new Array(partCount);
    // Progress = bytes of finished parts + live bytes of the parts currently
    // in flight, so several concurrent parts add up to one smooth percentage.
    let completedBytes = 0;
    const inFlight = new Map<number, number>();
    let nextPart = 0;

    const report = () => {
      let live = 0;
      for (const loaded of inFlight.values()) live += loaded;
      onProgress?.(
        Math.min(100, Math.round(((completedBytes + live) / file.size) * 100)),
      );
    };

    const worker = async () => {
      while (nextPart < partCount) {
        const i = nextPart++;
        const start = i * partSize;
        const end = Math.min(start + partSize, file.size);
        inFlight.set(i, 0);
        const etag = await putPart(
          partUrls,
          i + 1,
          file.slice(start, end),
          signal,
          (loaded) => {
            inFlight.set(i, loaded);
            report();
          },
        );
        parts[i] = { partNumber: i + 1, etag };
        inFlight.delete(i);
        completedBytes += end - start;
        report();
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(PART_CONCURRENCY, partCount) }, worker),
    );

    // Retried: failing this one call after minutes of transfer used to throw
    // the whole upload away.
    await withRetry(() =>
      postDrive(
        "/api/drive/multipart/complete",
        withDrive({ key, uploadId, parts }, drive),
        signal,
      ),
    );
    onProgress?.(100);
  } catch (error) {
    // Free the orphaned parts so they don't linger + incur storage cost.
    void postDrive(
      "/api/drive/multipart/abort",
      withDrive({ key, uploadId }, drive),
    ).catch(() => {});
    throw error;
  }
}

// Presigned URL: attachment by default, inline for previewing images/PDFs/….
async function presignedUrl(
  key: string,
  inline: boolean,
  drive?: DriveScope,
): Promise<string> {
  const res = await fetch(
    `/api/drive/download?key=${encodeURIComponent(key)}${inline ? "&inline=1" : ""}${drive ? "&drive=shared" : ""}`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error("Failed to get download URL");
  const { url } = (await res.json()) as { url: string };
  return url;
}

export const getDownloadUrl = (key: string, drive?: DriveScope) =>
  presignedUrl(key, false, drive);
export const getPreviewUrl = (key: string, drive?: DriveScope) =>
  presignedUrl(key, true, drive);

export async function listTrashApi(drive?: DriveScope): Promise<DriveItem[]> {
  const res = await fetch(`/api/drive/trash${drive ? "?drive=shared" : ""}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to list trash");
  return res.json();
}

export async function moveToTrashApi(
  paths: string[],
  drive?: DriveScope,
): Promise<void> {
  await postDrive("/api/drive/trash", withDrive({ paths }, drive));
}

export async function restoreApi(
  entryIds: string[],
  drive?: DriveScope,
): Promise<void> {
  await postDrive("/api/drive/restore", withDrive({ entryIds }, drive));
}

export async function deleteTrashApi(
  entryIds: string[],
  drive?: DriveScope,
): Promise<void> {
  await postDrive("/api/drive/trash/delete", withDrive({ entryIds }, drive));
}

export async function emptyTrashApi(drive?: DriveScope): Promise<void> {
  await postDrive("/api/drive/trash/empty", drive ? { drive } : undefined);
}
