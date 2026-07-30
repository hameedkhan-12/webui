import type { IRegistry, ComponentMeta, IAuraKernel } from '@repo/shared';
export declare class ComponentRegistry implements IRegistry<ComponentMeta> {
    private readonly kernel?;
    readonly namespace = "components";
    private readonly storage;
    private readonly listeners;
    private readonly allListeners;
    private readonly deferredAIPushes;
    constructor(kernel?: IAuraKernel | undefined);
    private flushAIPushes;
    register(key: string, value: ComponentMeta): void;
    unregister(key: string): void;
    get(key: string): ComponentMeta | undefined;
    has(key: string): boolean;
    get size(): number;
    get isEmpty(): boolean;
    getOrThrow(key: string): ComponentMeta;
    keys(): readonly string[];
    subscribe(key: string, cb: (value: ComponentMeta | undefined) => void): () => void;
    subscribeAll(cb: (key: string, value: ComponentMeta | undefined) => void): () => void;
}
//# sourceMappingURL=component.registry.d.ts.map