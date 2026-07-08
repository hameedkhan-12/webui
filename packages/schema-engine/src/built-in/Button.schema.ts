import type { ComponentSchema } from '@repo/shared'
import { textField } from '../field-types/text.field.js'
import { selectField } from '../field-types/select.field.js'
import { booleanField } from '../field-types/boolean.field.js'

export const ButtonSchema: ComponentSchema = {
  key: 'Button',
  fields: [
    textField('label', 'Button Label', {
      required: true,
      description: 'Text displayed on the button',
      validation: { min: 1, max: 60 }
    }),
    selectField('variant', 'Variant', [
      { label: 'Primary', value: 'primary' },
      { label: 'Secondary', value: 'secondary' },
      { label: 'Ghost', value: 'ghost' }
    ], {
      description: 'Visual style of the button'
    }),
    booleanField('disabled', 'Disabled', {
      description: 'Whether the button is non-interactive'
    }),
    textField('href', 'Link URL', {
      description: 'Optional URL to navigate to when clicked'
    })
  ]
}
