import { Operation, WorkspaceFiles, OperationSource, HistoryEntry } from '@repo/shared';
import { validateOperation } from './operationValidator';
import { applyOperation, ReducerResult } from './operationReducer';

export function runTransaction(
  ops: Operation[],
  label: string,
  source: OperationSource,
  state: { files: WorkspaceFiles; folders: string[]; elementCounter: number },
  dispatch: (nextState: ReducerResult) => void,
  pushHistory?: (entry: HistoryEntry) => void
): ReducerResult {
  const snapshot = {
    files: { ...state.files },
    folders: [...state.folders],
    elementCounter: state.elementCounter,
  };
  let current = {
    files: { ...state.files },
    folders: [...state.folders],
    elementCounter: state.elementCounter,
  };

  try {
    for (const op of ops) {
      const validation = validateOperation(op, current.files);
      if (!validation.ok) {
        throw new Error(validation.error);
      }
      current = applyOperation(current, op);
    }
  } catch (err: any) {
    throw new Error(`Transaction "${label}" failed validation: ${err.message}`);
  }

  dispatch(current);

  if (pushHistory) {
    pushHistory({
      ops,
      label,
      source,
      snapshot,
      txId: crypto.randomUUID(),
      timestamp: Date.now(),
    });
  }

  return current;
}
export type { ReducerResult };
export { applyOperation };
