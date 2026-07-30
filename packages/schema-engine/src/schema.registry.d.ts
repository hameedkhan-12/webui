import type { IRegistry, ComponentSchema, IAuraKernel } from '@repo/shared';
export declare class SchemaRegistry implements IRegistry<ComponentSchema> {
    private readonly kernel?;
    readonly namespace = "schemas";
    private readonly storage;
    private readonly listeners;
    private readonly allListeners;
    constructor(kernel?: IAuraKernel | undefined);
    register(key: string, value: ComponentSchema): void;
    unregister(key: string): void;
    get(key: string): ComponentSchema | undefined;
    getOrThrow(key: string): ComponentSchema;
    has(key: string): boolean;
    get size(): number;
    get isEmpty(): boolean;
    keys(): readonly string[];
    subscribe(key: string, cb: (value: ComponentSchema | undefined) => void): () => void;
    subscribeAll(cb: (key: string, value: ComponentSchema | undefined) => void): () => void;
}
//# sourceMappingURL=schema.registry.d.ts.map