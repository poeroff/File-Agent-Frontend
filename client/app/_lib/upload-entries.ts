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

// Recursively resolves dropped items (files AND folders) into upload inputs.
// Dropping a folder walks its whole tree; dropping a file yields just the file.
export async function readDroppedEntries(
  dataTransfer: DataTransfer,
): Promise<UploadInput[]> {
  // webkitGetAsEntry() must be called synchronously, before any await.
  const roots = Array.from(dataTransfer.items)
    .map((item) => item.webkitGetAsEntry?.() ?? null)
    .filter((entry): entry is FileSystemEntry => entry !== null);

  const results: UploadInput[] = [];

  async function walk(entry: FileSystemEntry, dir: string): Promise<void> {
    if (entry.isFile) {
      const file = await fileOf(entry as FileSystemFileEntry);
      results.push({ file, relativeDir: dir });
    } else if (entry.isDirectory) {
      const childDir = `${dir}${entry.name}/`;
      const children = await readAllEntries(
        (entry as FileSystemDirectoryEntry).createReader(),
      );
      for (const child of children) await walk(child, childDir);
    }
  }

  for (const root of roots) await walk(root, "");
  return results;
}
