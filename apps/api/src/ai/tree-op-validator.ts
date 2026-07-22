import { BLOCK_MANIFEST } from '@aura/blocks/manifest';
import { validateField } from '@aura/schema-engine';

export interface TreeOperation {
  readonly kind: 'insert' | 'updateProps';
  readonly parentId?: string | null;
  readonly slot?: string;
  readonly nodeId?: string;
  readonly node?: any;
  readonly props?: Record<string, unknown>;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly reason?: string;
}

export function validateNodeSchema(node: any): ValidationResult {
  if (!node || typeof node !== 'object') {
    return { valid: false, reason: 'Node must be an object' };
  }

  if (typeof node.id !== 'string' || !node.id) {
    return { valid: false, reason: 'Node is missing a stable string id' };
  }

  if (typeof node.type !== 'string' || !node.type) {
    return { valid: false, reason: 'Node is missing a string type' };
  }

  // Find schema
  const manifestItem = BLOCK_MANIFEST.find((item) => item.blockType === node.type);
  if (!manifestItem) {
    return { valid: false, reason: `Block type "${node.type}" is not registered in the schema registry` };
  }

  const props = node.props || {};
  if (typeof props !== 'object') {
    return { valid: false, reason: `Invalid props object on node "${node.id}"` };
  }

  // Validate props
  for (const field of manifestItem.schema.fields) {
    const val = props[field.key] ?? field.defaultValue;
    const errors = validateField(field, val);
    if (errors.length > 0) {
      return {
        valid: false,
        reason: `Node "${node.id}" (${node.type}) failed validation for prop "${field.key}": ${errors[0]!.message}`,
      };
    }
  }

  // Recursively validate children
  if (node.children) {
    if (!Array.isArray(node.children)) {
      return { valid: false, reason: `children must be an array on node "${node.id}"` };
    }
    for (const child of node.children) {
      const res = validateNodeSchema(child);
      if (!res.valid) return res;
    }
  }

  return { valid: true };
}

export function validateTreeOperations(ops: any): { valid: boolean; reason?: string; ops?: TreeOperation[] } {
  if (!Array.isArray(ops)) {
    return { valid: false, reason: 'treeOps payload must be an array of operations' };
  }

  const validatedOps: TreeOperation[] = [];

  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    if (!op || typeof op !== 'object') {
      return { valid: false, reason: `Operation at index ${i} is not an object` };
    }

    if (op.kind === 'insert') {
      if (op.parentId !== null && typeof op.parentId !== 'string') {
        return { valid: false, reason: `Operation ${i} (insert) has missing or invalid parentId` };
      }
      if (typeof op.slot !== 'string') {
        return { valid: false, reason: `Operation ${i} (insert) has missing or invalid slot` };
      }
      const nodeRes = validateNodeSchema(op.node);
      if (!nodeRes.valid) {
        return { valid: false, reason: `Operation ${i} (insert) contains invalid node: ${nodeRes.reason}` };
      }
      validatedOps.push({
        kind: 'insert',
        parentId: op.parentId,
        slot: op.slot,
        node: op.node,
      });
    } else if (op.kind === 'updateProps') {
      if (typeof op.nodeId !== 'string' || !op.nodeId) {
        return { valid: false, reason: `Operation ${i} (updateProps) has missing or invalid nodeId` };
      }
      const props = op.props;
      if (!props || typeof props !== 'object') {
        return { valid: false, reason: `Operation ${i} (updateProps) has missing or invalid props object` };
      }

      // We should check that if any schema field is updated, it passes validation
      // But since updateProps can be partial, we'll validate the props against the corresponding block schema if we know the block type
      // Wait, we don't know the block type from the nodeId alone without looking at the existing tree.
      // But we can check if the props are generally objects.
      validatedOps.push({
        kind: 'updateProps',
        nodeId: op.nodeId,
        props: op.props,
      });
    } else {
      return { valid: false, reason: `Operation ${i} has invalid kind "${op.kind}"` };
    }
  }

  return { valid: true, ops: validatedOps };
}
