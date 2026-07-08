// Export environment configuration
export * from "./config/env.config";
export type { Environment, AppConfig } from "./config/env.config";

// Export publish configuration
export * from "./config/publish.config";

// Export types
export type {} from "./types/environment";
export * from "./types/publish.types";

export * from "./types/cms.types";

export * from "./types/storage.types";

export * from "./types/template.types";

export * from "./types/collaboration.types";

export * from "./types/workspace.types";

// Aura core interfaces (Phase 1)
export type {
  RegistryLifecycle,
  IRegistry,
} from "./registry.interface";

export type { IAuraKernel } from "./kernel.interface";

export type {
  ComponentMeta,
  ComponentCategory,
  SlotDefinition,
  EventDefinition,
} from "./component-meta.interface";

export type {
  ComponentSchema,
  SchemaFieldType,
  SchemaField,
  SchemaFieldValidation,
  SelectOption,
  TailwindMapping,
} from "./component-schema.interface";

export type {
  IPersistenceAdapter,
  BaseOperation,
  UpdatePropOperation,
  UpdateStyleOperation,
  UpdateChildrenOperation,
  AddClassOperation,
  RemoveClassOperation,
} from "./persistence.interface";

export type {
  SelectionState,
  DOMRectLike,
} from "./selection.interface";

export type { AuraEvent, IEventBus } from "./event.interface";

export type {
  AIContextDescriptor,
  IAIRegistry,
  AIContextQuery,
} from "./ai-context.interface";

