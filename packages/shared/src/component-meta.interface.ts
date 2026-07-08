export interface ComponentMeta {
  readonly name: string
  readonly displayName: string
  readonly description: string
  readonly icon: string
  readonly category: ComponentCategory
  readonly tags: readonly string[]
  readonly slots: readonly SlotDefinition[]
  readonly variants: readonly string[]
  readonly events: readonly EventDefinition[]
  readonly permissions: readonly string[]
  readonly documentation: string
  readonly aiHints: readonly string[]
  readonly schemaKey: string
}

export type ComponentCategory =
  | 'layout'
  | 'typography'
  | 'media'
  | 'navigation'
  | 'form'
  | 'data'
  | 'feedback'
  | 'marketing'

export interface SlotDefinition {
  readonly key: string
  readonly label: string
  readonly accepts: readonly string[]
  readonly required: boolean
}

export interface EventDefinition {
  readonly key: string
  readonly label: string
  readonly description: string
}
