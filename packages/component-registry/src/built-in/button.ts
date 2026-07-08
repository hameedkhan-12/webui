import type { ComponentMeta } from '@repo/shared'

export const ButtonMeta: ComponentMeta = {
  name: 'Button',
  displayName: 'Button',
  description: 'An interactive button component.',
  icon: 'click',
  category: 'navigation',
  tags: ['button', 'interactive', 'input'],
  slots: [],
  variants: ['primary', 'secondary', 'ghost'],
  events: [
    { key: 'onClick', label: 'On Click', description: 'Triggers when the button is clicked' }
  ],
  permissions: [],
  documentation: 'https://docs.aura.dev/components/button',
  aiHints: ['interactive', 'clickable'],
  schemaKey: 'Button'
}
