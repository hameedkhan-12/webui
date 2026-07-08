import type { SchemaField, SelectOption } from '@repo/shared'

export function selectField(
  key: string,
  label: string,
  options: readonly SelectOption[],
  overrides?: Partial<SchemaField>
): SchemaField {
  return {
    key,
    type: 'select',
    label,
    options,
    defaultValue: options[0]?.value ?? '',
    ...overrides
  }
}
