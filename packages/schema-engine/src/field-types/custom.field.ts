import type { SchemaField } from '@repo/shared'

export function customField(key: string, label: string, overrides?: Partial<SchemaField>): SchemaField {
  return {
    key,
    type: 'custom',
    label,
    defaultValue: null,
    ...overrides
  }
}
