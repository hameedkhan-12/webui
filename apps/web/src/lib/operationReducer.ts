import { Operation, WorkspaceFiles } from '@repo/shared';
import {
  tagJSXCode,
  insertJSXElement,
  deleteJSXElement,
  moveJSXElement,
  updateJSXElement,
  injectIntoApp,
} from './jsxUtils';
import { normalizePath, stubForNewFile, deletePathPrefix, removeFolderFromList } from './workspaceFs';

export interface ReducerResult {
  files: WorkspaceFiles;
  folders: string[];
  elementCounter: number;
}

export function applyOperation(
  state: { files: WorkspaceFiles; folders: string[]; elementCounter: number },
  op: Operation
): ReducerResult {
  const { files, folders, elementCounter } = state;

  switch (op.type) {
    case 'INSERT_COMPONENT': {
      const appFile = files['src/app/page.tsx'];
      if (!appFile) return state;

      const { code: taggedCode, newCounter } = tagJSXCode(op.payload.code, elementCounter);
      const targetId = op.payload.targetId;
      let nextContent = '';

      if (targetId) {
        nextContent = insertJSXElement(appFile.content, targetId, taggedCode);
      } else {
        nextContent = injectIntoApp(appFile.content, taggedCode);
      }

      return {
        ...state,
        files: {
          ...files,
          'src/app/page.tsx': {
            ...appFile,
            content: nextContent,
          },
        },
        elementCounter: newCounter,
      };
    }

    case 'REMOVE_COMPONENT': {
      const appFile = files['src/app/page.tsx'];
      if (!appFile) return state;

      const nextContent = deleteJSXElement(appFile.content, op.payload.nodeId);
      return {
        ...state,
        files: {
          ...files,
          'src/app/page.tsx': {
            ...appFile,
            content: nextContent,
          },
        },
      };
    }

    case 'MOVE_COMPONENT': {
      const appFile = files['src/app/page.tsx'];
      if (!appFile) return state;

      const nextContent = moveJSXElement(appFile.content, op.payload.nodeId, op.payload.targetId);
      return {
        ...state,
        files: {
          ...files,
          'src/app/page.tsx': {
            ...appFile,
            content: nextContent,
          },
        },
      };
    }

    case 'UPDATE_PROP': {
      const { nodeId, filePath, key, value } = op.payload;
      const file = files[filePath];
      if (!file) return state;

      const updatedProps: { text?: string } = {};
      if (key === 'text') {
        updatedProps.text = String(value);
      }

      const nextContent = updateJSXElement(file.content, nodeId, updatedProps);
      return {
        ...state,
        files: {
          ...files,
          [filePath]: {
            ...file,
            content: nextContent,
          },
        },
      };
    }

    case 'UPDATE_CLASS': {
      const { nodeId, filePath, classes } = op.payload;
      const file = files[filePath];
      if (!file) return state;

      const nextContent = updateJSXElement(file.content, nodeId, { classes });
      return {
        ...state,
        files: {
          ...files,
          [filePath]: {
            ...file,
            content: nextContent,
          },
        },
      };
    }

    case 'CREATE_FILE': {
      const path = normalizePath(op.payload.path);
      if (!path) return state;

      // Always upsert — AI generation must overwrite existing files (e.g. page.tsx)
      const stub = op.payload.template || stubForNewFile(path);
      const existing = files[path];
      const newFiles = {
        ...files,
        [path]: {
          name: path.split('/').pop() || path,
          path,
          // Preserve existing meta if the file already existed
          ...(existing ? existing : {}),
          content: stub,
        },
      };
      const newFolders = removeFolderFromList(folders, path);

      return {
        ...state,
        files: newFiles,
        folders: newFolders,
      };
    }

    case 'DELETE_FILE': {
      const path = normalizePath(op.payload.path);
      const newFiles = { ...files };
      delete newFiles[path];

      return {
        ...state,
        files: newFiles,
      };
    }

    case 'CREATE_FOLDER': {
      const path = normalizePath(op.payload.path);
      if (!path || files[path] || folders.includes(path)) return state;

      return {
        ...state,
        folders: [...folders, path].sort(),
      };
    }

    case 'DELETE_FOLDER': {
      const path = normalizePath(op.payload.path);
      const nextFiles = deletePathPrefix(files, path);
      const nextFolders = removeFolderFromList(folders, path);

      return {
        ...state,
        files: nextFiles,
        folders: nextFolders,
      };
    }

    case 'UPDATE_FILE_RAW': {
      const path = normalizePath(op.payload.path);
      const file = files[path];
      if (!file) return state;

      return {
        ...state,
        files: {
          ...files,
          [path]: {
            ...file,
            content: op.payload.content,
          },
        },
      };
    }

    case 'BATCH': {
      let current = { files, folders, elementCounter };
      for (const subOp of op.payload.ops) {
        current = applyOperation(current, subOp);
      }
      return current;
    }

    default:
      return state;
  }
}
