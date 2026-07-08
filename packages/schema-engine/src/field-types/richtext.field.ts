import type { SchemaField } from '@repo/shared'

export function richtextField(key: string, label: string, overrides?: Partial<SchemaField>): SchemaField {
  return {
    key,
    type: 'richtext',
    label,
    defaultValue: '',
    ...overrides
  }
}
