import type { SchemaField } from '@repo/shared'

export function groupField(key: string, label: string, overrides?: Partial<SchemaField>): SchemaField {
  return {
    key,
    type: 'group',
    label,
    defaultValue: {},
    ...overrides
  }
}
