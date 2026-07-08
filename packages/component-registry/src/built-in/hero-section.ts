import type { ComponentMeta } from '@repo/shared'

export const HeroSectionMeta: ComponentMeta = {
  name: 'HeroSection',
  displayName: 'Hero Section',
  description: 'A marketing hero block with heading, subheading, and CTA options.',
  icon: 'layout-hero',
  category: 'marketing',
  tags: ['hero', 'marketing', 'above-the-fold'],
  slots: [
    { key: 'heading', label: 'Heading Slot', accepts: ['*'], required: true },
    { key: 'subheading', label: 'Subheading Slot', accepts: ['*'], required: false },
    { key: 'cta', label: 'CTA Slot', accepts: ['Button'], required: false }
  ],
  variants: ['default', 'centered', 'split'],
  events: [],
  permissions: [],
  documentation: 'https://docs.aura.dev/components/hero-section',
  aiHints: ['above-fold', 'full-width', 'marketing'],
  schemaKey: 'HeroSection'
}
