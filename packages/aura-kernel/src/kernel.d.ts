import type { IAuraKernel, IRegistry, RegistryLifecycle } from '@repo/shared';
export declare class AuraKernel implements IAuraKernel {
    private _lifecycle;
    private readonly registries;
    private readonly onLifecycleChange;
    constructor(onLifecycleChange?: (lifecycle: RegistryLifecycle) => void);
    get lifecycle(): RegistryLifecycle;
    private transition;
    mount<T>(registry: IRegistry<T>): void;
    boot(): Promise<void>;
    get<T>(namespace: string): IRegistry<T>;
    dispose(): void;
}
//# sourceMappingURL=kernel.d.ts.map