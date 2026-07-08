import type { IAIRegistry } from '@repo/shared'

/**
 * Phase 3 — AI layer orchestrator.
 * Reads from IAIRegistry; never scans the filesystem.
 */
export interface IAILayer {
  queryContext(_query: string): Promise<readonly string[]>
  suggestEdits(_selectionAuraId: string): Promise<unknown>
}

export class AILayerStub implements IAILayer {
  async queryContext(_query: string): Promise<readonly string[]> {
    throw new Error('AILayerStub: not implemented in Phase 1')
  }

  async suggestEdits(_selectionAuraId: string): Promise<unknown> {
    throw new Error('AILayerStub: not implemented in Phase 1')
  }
}

/**
 * Phase 3 — Code generation service.
 * Generated files flow through AST persistence → Vite HMR.
 */
export interface ICodeGenerationService {
  generateComponent(_prompt: string): Promise<string>
}

export class CodeGenerationStub implements ICodeGenerationService {
  constructor(_aiRegistry: IAIRegistry) {}

  async generateComponent(_prompt: string): Promise<string> {
    throw new Error('CodeGenerationStub: not implemented in Phase 1')
  }
}
