import { WorkspaceFiles } from '@repo/shared';

/** Normalize a workspace path (no leading ./ or trailing /). */
export function normalizePath(raw: string): string {
  return raw
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
}

export function isFolderPath(path: string): boolean {
  return !path.includes('.') || path.endsWith('/');
}

export function parentFolder(path: string): string {
  const normalized = normalizePath(path);
  const idx = normalized.lastIndexOf('/');
  return idx === -1 ? '' : normalized.slice(0, idx);
}

/** Collect implicit folders from file paths plus explicit empty folders. */
export function getAllFolderPaths(files: WorkspaceFiles, explicitFolders: string[]): string[] {
  const set = new Set<string>();

  for (const folder of explicitFolders) {
    const f = normalizePath(folder);
    if (f) set.add(f);
  }

  for (const filePath of Object.keys(files)) {
    const parts = normalizePath(filePath).split('/');
    for (let i = 1; i < parts.length; i++) {
      set.add(parts.slice(0, i).join('/'));
    }
  }

  return Array.from(set).sort();
}

export function listPathsForTree(files: WorkspaceFiles, explicitFolders: string[]): string[] {
  const filePaths = Object.keys(files).map(normalizePath);
  const folderPaths = getAllFolderPaths(files, explicitFolders);
  const combined = new Set<string>([...filePaths, ...folderPaths]);
  return Array.from(combined).sort();
}

export function deletePathPrefix(files: WorkspaceFiles, prefix: string): WorkspaceFiles {
  const root = normalizePath(prefix);
  const next: WorkspaceFiles = {};
  for (const [path, file] of Object.entries(files)) {
    const p = normalizePath(path);
    if (p === root || p.startsWith(`${root}/`)) continue;
    next[path] = file;
  }
  return next;
}

export function removeFolderFromList(folders: string[], folderPath: string): string[] {
  const root = normalizePath(folderPath);
  return folders.filter((f) => {
    const p = normalizePath(f);
    return p !== root && !p.startsWith(`${root}/`);
  });
}

export function stubForNewFile(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const isPage = path.includes('/page.') || path.endsWith('page.tsx') || path.endsWith('page.jsx');
  if (ext === 'tsx' || ext === 'jsx') {
    const name = isPage ? 'Page' : componentNameFromPath(path);
    return `export default function ${name}() {\n  return <div className="p-4">New component</div>;\n}\n`;
  }
  if (ext === 'ts' || ext === 'js') {
    return `// ${path}\nexport {};\n`;
  }
  if (ext === 'css') {
    return `/* ${path} */\n`;
  }
  if (ext === 'json') {
    return '{}';
  }
  return `// ${path}\n`;
}

function componentNameFromPath(path: string): string {
  const base = path.split('/').pop()?.replace(/\.[^.]+$/, '') ?? 'Component';
  return base.replace(/[^a-zA-Z0-9]/g, '') || 'Component';
}

export function filesAndFoldersToPayload(
  files: WorkspaceFiles,
  folders: string[]
): { path: string; content: string; kind: 'file' | 'folder' }[] {
  const entries: { path: string; content: string; kind: 'file' | 'folder' }[] = [];

  for (const [path, file] of Object.entries(files)) {
    entries.push({ path: normalizePath(path), content: file.content, kind: 'file' });
  }

  for (const folder of folders) {
    const p = normalizePath(folder);
    if (!p) continue;
    const hasFile = entries.some((e) => e.kind === 'file' && (e.path === p || e.path.startsWith(`${p}/`)));
    if (!hasFile) {
      entries.push({ path: p, content: '', kind: 'folder' });
    }
  }

  return entries;
}

export function payloadToFilesAndFolders(
  entries: { path: string; content: string; kind: 'file' | 'folder' }[]
): { files: WorkspaceFiles; folders: string[] } {
  const files: WorkspaceFiles = {};
  const folders: string[] = [];

  for (const entry of entries) {
    const path = normalizePath(entry.path);
    if (!path) continue;

    if (entry.kind === 'folder') {
      folders.push(path);
    } else {
      const name = path.split('/').pop() || path;
      files[path] = { name, path, content: entry.content };
    }
  }

  return { files, folders };
}
