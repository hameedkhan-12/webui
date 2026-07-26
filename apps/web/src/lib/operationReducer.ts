// apps/web/src/lib/operationReducer.ts
import { Operation, WorkspaceFiles } from '@repo/shared';
import {
  insertElement,
  insertSibling,
  insertIntoFileRoot,
  deleteElement,
  moveElement,
  updateProp,
  updateChildren,
  setClasses,
  tagWithCounter,
  AstMutationError,
} from '@aura/ast-engine';
import { normalizePath, stubForNewFile, deletePathPrefix, removeFolderFromList } from './workspaceFs';

export interface ReducerResult {
  files: WorkspaceFiles;
  folders: string[];
  elementCounter: number;
}

/**
 * NOTE ON THIS REWRITE: this reducer previously mutated JSX via
 * apps/web/src/lib/jsxUtils.ts, a hand-written regex/character scanner. That
 * scanner had no concept of JSX nesting depth (it could match the wrong
 * closing tag when two sibling elements shared a tag name) and did a naive
 * full-string className replace with no awareness of cn()/clsx() calls. It's
 * been replaced with @aura/ast-engine, a real Babel-parser-based engine --
 * see packages/ast-engine/src/ast.writer.ts for the mutation implementations
 * and packages/ast-engine/src/ast.engine.test.ts for tests proving the
 * specific bug classes this fixes.
 *
 * KNOWN LIMITATION CARRIED FORWARD UNCHANGED: INSERT_COMPONENT,
 * REMOVE_COMPONENT, and MOVE_COMPONENT are still hardcoded to operate only on
 * 'src/app/page.tsx' -- the Operation type itself has no filePath field for
 * these three cases (only UPDATE_PROP/UPDATE_CLASS carry filePath). Extending
 * these to arbitrary files requires changing packages/shared's Operation type,
 * which is out of scope for this pass -- flagging it rather than silently
 * leaving it for a future surprise.
 *
 * ALSO WORTH KNOWING: as of this rewrite, none of INSERT_COMPONENT /
 * REMOVE_COMPONENT / MOVE_COMPONENT / UPDATE_PROP / UPDATE_CLASS are actually
 * dispatched anywhere in the current app (verified via a full grep across
 * apps/web/src). This reducer logic is presently unreachable dead code,
 * waiting on a real inspector/drag-and-drop UI to call it. That UI is not
 * part of this change.
 */

/** AstMutationError means "found the node, but refuse to touch it unsafely"
 *  -- never crash the caller; log loudly and return state unchanged so a
 *  future UI can catch this the same way and show a real error message. */
function safeMutate(label: string, fn: () => string, fallback: string): string {
  try {
    return fn();
  } catch (err) {
    if (err instanceof AstMutationError) {
      console.error(`[operationReducer] ${label} refused for aura-id "${err.auraId}": ${err.message}`);
      return fallback;
    }
    throw err;
  }
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

      const { code: taggedCode, newCounter } = tagWithCounter(op.payload.code, elementCounter);
      const targetId = op.payload.targetId;

      const nextContent = safeMutate(
        'INSERT_COMPONENT',
        () => {
          if (!targetId) {
            return insertIntoFileRoot(appFile.content, taggedCode);
          }
          if (op.payload.position === 'inside') {
            return insertElement(appFile.content, { parentAuraId: targetId, elementCode: taggedCode, position: 'end' });
          }
          return insertSibling(appFile.content, targetId, taggedCode, op.payload.position);
        },
        appFile.content
      );

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

      const nextContent = safeMutate(
        'REMOVE_COMPONENT',
        () => deleteElement(appFile.content, op.payload.nodeId),
        appFile.content
      );

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

      const nextContent = safeMutate(
        'MOVE_COMPONENT',
        () => moveElement(appFile.content, op.payload.nodeId, op.payload.targetId, 'end'),
        appFile.content
      );

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

      // 'text' is special-cased to mean "the element's text children", not a
      // JSX attribute named "text" -- matches the previous engine's semantic.
      // Every other key is now a real JSX attribute update (the previous
      // engine silently no-op'd for any key other than 'text' -- this is a
      // genuine capability upgrade, not just a swap).
      const nextContent = safeMutate(
        'UPDATE_PROP',
        () =>
          key === 'text'
            ? updateChildren(file.content, { file: filePath, line: 0, auraId: nodeId, value: String(value) })
            : updateProp(file.content, { file: filePath, line: 0, auraId: nodeId, prop: key, value }),
        file.content
      );

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

      const nextContent = safeMutate(
        'UPDATE_CLASS',
        () => setClasses(file.content, nodeId, classes),
        file.content
      );

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