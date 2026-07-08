import type { ComponentMeta } from './component-meta.interface'
import type { ComponentSchema } from './component-schema.interface'

export interface SelectionState {
  readonly auraId: string | null
  readonly file: string | null
  readonly line: number | null
  readonly componentName: string | null
  readonly rect: DOMRectLike | null
  readonly computedTailwindClasses: readonly string[]
  readonly resolvedMeta: ComponentMeta | null
  readonly resolvedSchema: ComponentSchema | null
}

export interface DOMRectLike {
  readonly top: number
  readonly left: number
  readonly width: number
  readonly height: number
}
