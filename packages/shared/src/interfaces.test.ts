import { describe, expect, it } from 'vitest'

import type {
  AIContextDescriptor,
  AIContextQuery,
  AddClassOperation,
  AuraEvent,
  ComponentMeta,
  ComponentSchema,
  DOMRectLike,
  IAuraKernel,
  IAIRegistry,
  IEventBus,
  IPersistenceAdapter,
  IRegistry,
  RemoveClassOperation,
  SchemaField,
  SelectionState,
  UpdateChildrenOperation,
  UpdatePropOperation,
  UpdateStyleOperation,
} from './index'

describe('@repo/shared interfaces', () => {
  it('exports all public interface types', () => {
    expect(true).toBe(true)
  })
})

const mockRegistry = {
  namespace: 'test',
  register: (_key: string, _value: ComponentMeta): void => { },
  unregister: (_key: string): void => { },
  get: (_key: string): ComponentMeta | undefined => undefined,
  has: (_key: string): boolean => false,
  keys: (): readonly string[] => [],
  subscribe: (_key: string, _cb: (value: ComponentMeta | undefined) => void): (() => void) => () => { },
} satisfies IRegistry<ComponentMeta>

const mockKernel = {
  lifecycle: 'READY' as const,
  mount: <T>(_registry: IRegistry<T>): void => { },
  get: <T>(_namespace: string): IRegistry<T> => mockRegistry as unknown as IRegistry<T>,
  boot: async (): Promise<void> => { },
  dispose: (): void => { },
} satisfies IAuraKernel

const mockComponentMeta = {
  name: 'HeroSection',
  displayName: 'Hero Section',
  description: 'Marketing hero block',
  icon: 'layout-hero',
  category: 'marketing' as const,
  tags: ['hero', 'marketing'],
  slots: [{ key: 'heading', label: 'Heading', accepts: ['*'], required: true }],
  variants: ['default'],
  events: [{ key: 'onClick', label: 'Click', description: 'CTA click' }],
  permissions: [],
  documentation: 'https://docs.aura.dev/components/hero-section',
  aiHints: ['above-fold', 'full-width'],
  schemaKey: 'HeroSection',
} satisfies ComponentMeta

const mockSchemaField = {
  key: 'heading',
  type: 'text' as const,
  label: 'Heading',
  required: true,
} satisfies SchemaField

const mockComponentSchema = {
  key: 'HeroSection',
  fields: [mockSchemaField],
} satisfies ComponentSchema

const mockUpdatePropOp = {
  file: '/app/src/HeroSection.tsx',
  line: 12,
  auraId: 'abc12345',
  prop: 'heading',
  value: 'Hello Aura',
} satisfies UpdatePropOperation

const mockUpdateStyleOp = {
  file: '/app/src/HeroSection.tsx',
  line: 12,
  auraId: 'abc12345',
  oldClass: 'text-lg',
  newClass: 'text-xl',
} satisfies UpdateStyleOperation

const mockUpdateChildrenOp = {
  file: '/app/src/HeroSection.tsx',
  line: 12,
  auraId: 'abc12345',
  value: 'Updated text',
} satisfies UpdateChildrenOperation

const mockAddClassOp = {
  file: '/app/src/HeroSection.tsx',
  line: 12,
  auraId: 'abc12345',
  className: 'font-bold',
} satisfies AddClassOperation

const mockRemoveClassOp = {
  file: '/app/src/HeroSection.tsx',
  line: 12,
  auraId: 'abc12345',
  className: 'font-bold',
} satisfies RemoveClassOperation

const mockPersistenceAdapter = {
  name: 'ast',
  updateProp: async (_op: UpdatePropOperation): Promise<void> => { },
  updateStyle: async (_op: UpdateStyleOperation): Promise<void> => { },
  updateChildren: async (_op: UpdateChildrenOperation): Promise<void> => { },
  addClass: async (_op: AddClassOperation): Promise<void> => { },
  removeClass: async (_op: RemoveClassOperation): Promise<void> => { },
} satisfies IPersistenceAdapter

const mockRect = {
  top: 0,
  left: 0,
  width: 100,
  height: 50,
} satisfies DOMRectLike

const mockSelectionState = {
  auraId: 'abc12345',
  file: '/app/src/HeroSection.tsx',
  line: 12,
  componentName: 'HeroSection',
  rect: mockRect,
  computedTailwindClasses: ['text-lg', 'font-bold'],
  resolvedMeta: mockComponentMeta,
  resolvedSchema: mockComponentSchema,
} satisfies SelectionState

const mockAuraEvent = {
  type: 'selection:changed',
  payload: undefined,
  timestamp: Date.now(),
} satisfies AuraEvent

const mockEventBus = {
  emit: <T>(_event: AuraEvent<T>): void => { },
  on: <T>(_type: string, _handler: (event: AuraEvent<T>) => void): (() => void) => () => { },
  off: <T>(_type: string, _handler: (event: AuraEvent<T>) => void): void => { },
} satisfies IEventBus

const mockAIContext = {
  componentName: 'HeroSection',
  summary: 'Full-width marketing hero with heading and CTA',
  capabilities: ['heading', 'subheading', 'cta'],
  usagePatterns: ['landing-page-above-fold'],
  schemaSnapshot: { heading: 'text', ctaText: 'text' },
} satisfies AIContextDescriptor

const mockAIQuery = {
  category: 'marketing' as const,
  tags: ['hero'],
  limit: 10,
} satisfies AIContextQuery

const mockAIRegistry = {
  namespace: 'ai',
  register: (_key: string, _value: AIContextDescriptor): void => { },
  unregister: (_key: string): void => { },
  get: (_key: string): AIContextDescriptor | undefined => undefined,
  has: (_key: string): boolean => false,
  keys: (): readonly string[] => [],
  subscribe: (_key: string, _cb: (value: AIContextDescriptor | undefined) => void): (() => void) => () => { },
  getContextSlice: (_query: AIContextQuery): readonly AIContextDescriptor[] => [],
} satisfies IAIRegistry

void mockRegistry
void mockKernel
void mockComponentMeta
void mockComponentSchema
void mockUpdatePropOp
void mockUpdateStyleOp
void mockUpdateChildrenOp
void mockAddClassOp
void mockRemoveClassOp
void mockPersistenceAdapter
void mockSelectionState
void mockAuraEvent
void mockEventBus
void mockAIContext
void mockAIQuery
void mockAIRegistry
