import type { SchemaField } from '@repo/shared'

export function arrayField(key: string, label: string, overrides?: Partial<SchemaField>): SchemaField {
  return {
    key,
    type: 'array',
    label,
    defaultValue: [],
    ...overrides
  }
}
