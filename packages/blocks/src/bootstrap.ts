import { AuraKernel } from '@aura/kernel'
import { ComponentRegistry } from '@aura/component-registry'
import { SchemaRegistry } from '@aura/schema-engine'
import type { IAuraKernel, RegistryLifecycle, ComponentMeta, ComponentSchema } from '@repo/shared'
import type { ComponentType } from 'react'

import { BUILT_IN_BLOCKS } from './registry.js'
import type { BlockDefinition } from './types.js'

export interface AuraRuntime {
    readonly kernel: IAuraKernel
    readonly components: ComponentRegistry
    readonly schemas: SchemaRegistry
    /**
     * Meta and schema live in kernel-managed IRegistry instances (they're
     * pure data, and other consumers like the AI context need them there).
     * The actual React component reference is intentionally NOT stored in
     * either registry -- IRegistry<T> is meant for plain, serializable data,
     * and a ComponentType doesn't belong in something the AI/persistence
     * layer can introspect. This lookup is the renderer's on-ramp instead.
     */
    getComponent(schemaKey: string): ComponentType<any> | undefined
}

let singleton: AuraRuntime | undefined

/**
 * Boots the Aura kernel and registers every built-in block's meta +
 * schema. Idempotent -- calling this more than once (e.g. across HMR
 * reloads in dev) returns the existing runtime instead of re-mounting
 * and hitting AuraKernel's namespace-collision guard.
 *
 * Call this ONCE, near the root of the app (see apps/web wiring below).
 */
export async function bootstrapAura(
    blocks: readonly BlockDefinition[] = BUILT_IN_BLOCKS,
    onLifecycleChange?: (lifecycle: RegistryLifecycle) => void
): Promise<AuraRuntime> {
    if (singleton) return singleton

    const kernel = new AuraKernel(onLifecycleChange)
    const components = new ComponentRegistry(kernel)
    const schemas = new SchemaRegistry(kernel)

    kernel.mount(components)
    kernel.mount(schemas)

    const componentsByKey = new Map<string, ComponentType<any>>()

    for (const block of blocks) {
        assertBlockIsWellFormed(block)
        components.register(block.meta.schemaKey, block.meta)
        schemas.register(block.schema.key, block.schema)
        componentsByKey.set(block.meta.schemaKey, block.component)
    }

    await kernel.boot()

    singleton = {
        kernel,
        components,
        schemas,
        getComponent: (schemaKey: string) => componentsByKey.get(schemaKey)
    }

    return singleton
}

/** Test-only escape hatch -- production code should never need this. */
export function __resetAuraRuntimeForTests(): void {
    singleton?.kernel.dispose()
    singleton = undefined
}

function assertBlockIsWellFormed(
    block: BlockDefinition
): asserts block is BlockDefinition & { meta: ComponentMeta; schema: ComponentSchema } {
    const { meta, schema } = block
    if (!meta || !schema) {
        throw new Error(`bootstrapAura(): block "${block.blockType}" is missing meta or schema.`)
    }
    if (meta.schemaKey !== schema.key) {
        throw new Error(
            `bootstrapAura(): block "${meta.name}" has mismatched keys -- ` +
            `meta.schemaKey ("${meta.schemaKey}") must equal schema.key ("${schema.key}").`
        )
    }
}

export type { ComponentMeta, ComponentSchema }
