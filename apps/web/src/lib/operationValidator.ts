import { Operation, WorkspaceFiles, ValidationResult } from '@repo/shared';

const PROTECTED_FILES = new Set([
  'src/app/page.tsx',
  'src/app/layout.tsx',
  'src/app/globals.css',
  'package.json',
  'next.config.ts',
  'next-env.d.ts',
  'tsconfig.json',
  'postcss.config.mjs',
  'tailwind.config.ts',
]);

export function validateOperation(op: Operation, files: WorkspaceFiles): ValidationResult {
  switch (op.type) {
    case 'MOVE_COMPONENT': {
      const { nodeId, targetId } = op.payload;
      if (nodeId === targetId) {
        return { ok: false, error: 'Cannot move a component into itself' };
      }
      return { ok: true };
    }

    case 'DELETE_FILE': {
      const { path } = op.payload;
      if (PROTECTED_FILES.has(path)) {
        return { ok: false, error: `Cannot delete protected system file: ${path}` };
      }
      if (!files[path]) {
        return { ok: false, error: `File not found: ${path}` };
      }
      return { ok: true };
    }

    case 'UPDATE_PROP':
    case 'UPDATE_CLASS': {
      const { filePath } = op.payload;
      if (!files[filePath]) {
        return { ok: false, error: `Target file not found: ${filePath}` };
      }
      return { ok: true };
    }

    default:
      return { ok: true };
  }
}
