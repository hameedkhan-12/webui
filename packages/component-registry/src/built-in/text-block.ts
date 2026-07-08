import type { ComponentMeta } from '@repo/shared'

export const TextBlockMeta: ComponentMeta = {
  name: 'TextBlock',
  displayName: 'Text Block',
  description: 'A rich typography block.',
  icon: 'typography',
  category: 'typography',
  tags: ['text', 'typography', 'content'],
  slots: [],
  variants: ['default', 'lead', 'muted'],
  events: [],
  permissions: [],
  documentation: 'https://docs.aura.dev/components/text-block',
  aiHints: ['typography', 'content'],
  schemaKey: 'TextBlock'
}
