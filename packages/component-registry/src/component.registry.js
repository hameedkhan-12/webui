export class ComponentRegistry {
    kernel;
    namespace = 'components';
    storage = new Map();
    listeners = new Map();
    allListeners = new Set();
    deferredAIPushes = [];
    constructor(kernel) {
        this.kernel = kernel;
    }
    flushAIPushes() {
        if (this.kernel && this.kernel.lifecycle === 'READY' && this.deferredAIPushes.length > 0) {
            try {
                const aiRegistry = this.kernel.get('ai');
                if (aiRegistry) {
                    while (this.deferredAIPushes.length > 0) {
                        const meta = this.deferredAIPushes.shift();
                        aiRegistry.register(meta.name, {
                            componentName: meta.name,
                            summary: meta.description,
                            capabilities: meta.tags || [],
                            usagePatterns: meta.aiHints || [],
                            schemaSnapshot: {}
                        });
                    }
                }
            }
            catch (e) {
                // Silently catch and keep deferred if the registry is not available or throws
            }
        }
    }
    register(key, value) {
        this.flushAIPushes();
        if (!value.name || !value.schemaKey) {
            throw new Error(`ComponentRegistry.register(): Missing required fields (name: '${value.name}', schemaKey: '${value.schemaKey}').`);
        }
        if (this.storage.has(key)) {
            throw new Error(`ComponentRegistry.register(): Component '${key}' is already registered.`);
        }
        this.storage.set(key, value);
        const keyListeners = this.listeners.get(key);
        if (keyListeners) {
            for (const cb of keyListeners) {
                cb(value);
            }
        }
        for (const cb of this.allListeners) {
            cb(key, value);
        }
        if (this.kernel && this.kernel.lifecycle === 'READY') {
            try {
                const aiRegistry = this.kernel.get('ai');
                if (aiRegistry) {
                    aiRegistry.register(value.name, {
                        componentName: value.name,
                        summary: value.description,
                        capabilities: value.tags || [],
                        usagePatterns: value.aiHints || [],
                        schemaSnapshot: {}
                    });
                }
            }
            catch (e) {
                this.deferredAIPushes.push(value);
            }
        }
        else {
            this.deferredAIPushes.push(value);
        }
    }
    unregister(key) {
        this.flushAIPushes();
        const existed = this.storage.get(key);
        if (!existed)
            return;
        this.storage.delete(key);
        const keyListeners = this.listeners.get(key);
        if (keyListeners) {
            for (const cb of keyListeners) {
                cb(undefined);
            }
        }
        for (const cb of this.allListeners) {
            cb(key, undefined);
        }
        if (this.kernel && this.kernel.lifecycle === 'READY') {
            try {
                const aiRegistry = this.kernel.get('ai');
                if (aiRegistry) {
                    aiRegistry.unregister(key);
                }
            }
            catch (e) {
                // Silently ignore
            }
        }
    }
    get(key) {
        this.flushAIPushes();
        return this.storage.get(key);
    }
    has(key) {
        this.flushAIPushes();
        return this.storage.has(key);
    }
    get size() {
        return this.storage.size;
    }
    get isEmpty() {
        return this.storage.size === 0;
    }
    getOrThrow(key) {
        const value = this.get(key);
        if (value === undefined) {
            throw new Error(`ComponentRegistry.getOrThrow(): No component registered for key '${key}'.`);
        }
        return value;
    }
    keys() {
        this.flushAIPushes();
        return Array.from(this.storage.keys());
    }
    subscribe(key, cb) {
        this.flushAIPushes();
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        this.listeners.get(key).add(cb);
        return () => {
            const set = this.listeners.get(key);
            if (set) {
                set.delete(cb);
                if (set.size === 0) {
                    this.listeners.delete(key);
                }
            }
        };
    }
    subscribeAll(cb) {
        this.allListeners.add(cb);
        return () => {
            this.allListeners.delete(cb);
        };
    }
}
//# sourceMappingURL=component.registry.js.map