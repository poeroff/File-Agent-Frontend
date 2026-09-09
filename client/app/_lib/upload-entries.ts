// One file to upload, plus the sub-directory (relative to the current folder)
// it should land in. relativeDir is "" for a top-level file or ends with "/".
export interface UploadInput {
  file: File;
  relativeDir: string;
}

// Turns a FileList (from <input type="file"> or a folder <input webkitdirectory>)
// into upload inputs, preserving folder structure via webkitRelativePath.
export function toUploadList(fileList: FileList | File[]): UploadInput[] {
  return Array.from(fileList).map((file) => {
    const rel = (file as File & { webkitRelativePath?: string })
      .webkitRelativePath;
    if (rel && rel.includes("/")) {
      return { file, relativeDir: rel.slice(0, rel.lastIndexOf("/") + 1) };
    }
    return { file, relativeDir: "" };
  });
}

function fileOf(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => entry.file(resolve, reject));
}

function readAllEntries(
  reader: FileSystemDirectoryReader,
): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => {
    const all: FileSystemEntry[] = [];
    const readBatch = () =>
      reader.readEntries((batch) => {
        if (batch.length === 0) resolve(all);
        else {
          all.push(...batch);
          readBatch();
        }
      }, reject);
    readBatch();
  });
}

// Grabs the dropped items' entry handles. MUST run synchronously inside the
// drop event — the DataTransfer items are cleared the moment the handler yields
// (any await), so this can't be deferred.
export function getDroppedRoots(dataTransfer: DataTransfer): FileSystemEntry[] {
  return Array.from(dataTransfer.items)
    .map((item) => item.webkitGetAsEntry?.() ?? null)
    .filter((entry): entry is FileSystemEntry => entry !== null);
}

// Resolves dropped roots (files AND folders) into upload inputs, walking a
// folder's whole tree. Siblings are walked in parallel so a big tree enumerates
// in a fraction of the time the old file-by-file sequential walk took.
//
// A file the OS won't hand over (a cloud placeholder such as a OneDrive
// online-only file, or one moved/locked since the drop) rejects with
// NotFoundError; it's skipped and counted instead of failing the whole drop.
export async function readEntries(
  roots: FileSystemEntry[],
): Promise<{ inputs: UploadInput[]; unreadable: number }> {
  const results: UploadInput[] = [];
  let unreadable = 0;

  async function walk(entry: FileSystemEntry, dir: string): Promise<void> {
    if (entry.isFile) {
      try {
        const file = await fileOf(entry as FileSystemFileEntry);
        results.push({ file, relativeDir: dir });
      } catch (error) {
        console.warn(`Skipping unreadable file: ${dir}${entry.name}`, error);
        unreadable += 1;
      }
    } else if (entry.isDirectory) {
      const childDir = `${dir}${entry.name}/`;
      const children = await readAllEntries(
        (entry as FileSystemDirectoryEntry).createReader(),
      );
      await Promise.all(children.map((child) => walk(child, childDir)));
    }
  }

  await Promise.all(roots.map((root) => walk(root, "")));
  return { inputs: results, unreadable };
}
