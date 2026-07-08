import type { SchemaField } from '@repo/shared'

export function colorField(key: string, label: string, overrides?: Partial<SchemaField>): SchemaField {
  return {
    key,
    type: 'color',
    label,
    defaultValue: '#000000',
    ...overrides
  }
}
