import type { ComponentCategory } from './component-meta.interface'
import type { IRegistry } from './registry.interface'

export interface AIContextDescriptor {
  readonly componentName: string
  readonly summary: string
  readonly capabilities: readonly string[]
  readonly usagePatterns: readonly string[]
  readonly schemaSnapshot: Readonly<Record<string, string>>
}

export interface IAIRegistry extends IRegistry<AIContextDescriptor> {
  getContextSlice(query: AIContextQuery): readonly AIContextDescriptor[]
}

export interface AIContextQuery {
  readonly category?: ComponentCategory
  readonly tags?: readonly string[]
  readonly hasSlot?: string
  readonly limit?: number
}
