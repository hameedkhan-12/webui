import type { SchemaField } from '@repo/shared'

export function imageField(key: string, label: string, overrides?: Partial<SchemaField>): SchemaField {
  return {
    key,
    type: 'image',
    label,
    defaultValue: '',
    ...overrides
  }
}
