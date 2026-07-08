import type { SchemaField } from '@repo/shared'

export function booleanField(key: string, label: string, overrides?: Partial<SchemaField>): SchemaField {
  return {
    key,
    type: 'boolean',
    label,
    defaultValue: false,
    ...overrides
  }
}
