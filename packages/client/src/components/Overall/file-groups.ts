export interface FileEntry {
  path: string;
  size: number;
  initial: boolean;
}

export interface FileGroup {
  key: string;
  dir: string;
  files: Array<{
    key: string;
    fileName: string;
    size: number;
    initial: boolean;
  }>;
}

// Tree keys must be unique across the whole tree: virtualized rows are keyed by
// them, so basenames shared between directories would render the wrong rows.
export const groupFilesByDir = (files: FileEntry[]): FileGroup[] => {
  const groups = new Map<string, FileGroup>();

  for (const { path, size, initial } of files) {
    const segments = path.split('/');
    const fileName = segments.pop()!;
    const dir = segments.join('/') || 'output';

    let group = groups.get(dir);
    if (!group) {
      group = { key: `dir:${dir}`, dir, files: [] };
      groups.set(dir, group);
    }
    group.files.push({ key: `file:${path}`, fileName, size, initial });
  }

  return [...groups.values()];
};
