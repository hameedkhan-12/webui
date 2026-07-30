import { parseComponentMetaFromSource } from './meta-parser.js';
export async function workspaceBridgeOnTransaction(op) {
    try {
        if (op.type === 'CREATE_FILE' || op.type === 'UPDATE_FILE_RAW') {
            const path = op.payload.path;
            const content = op.type === 'CREATE_FILE' ? op.payload.template : op.payload.content;
            if (!path || !content)
                return;
            const meta = parseComponentMetaFromSource(path, content);
            if (!meta)
                return;
            // Post a message to any iframe preview (LivePreview listens for this)
            try {
                if (typeof window !== 'undefined' && typeof window.parent !== 'undefined') {
                    window.parent.postMessage({ type: 'AURA_REGISTER_GENERATED_COMPONENT', meta, path }, '*');
                }
            }
            catch (e) {
                // ignore
            }
            // If an in-page aura runtime is present, register directly
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const runtimeAny = globalThis.__auraRuntime;
                if (runtimeAny && typeof runtimeAny.registerComponentMeta === 'function') {
                    runtimeAny.registerComponentMeta(meta);
                }
            }
            catch (e) {
                // ignore
            }
            // Fire-and-forget: persist generated metadata to backend API for durability
            try {
                const fetchFn = globalThis.fetch || (typeof window !== 'undefined' ? window.fetch : undefined);
                if (fetchFn) {
                    const p = fetchFn('/api/aura/register-generated', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ projectId: 'default', path, meta }),
                    });
                    if (p && typeof p.then === 'function')
                        p.catch(() => { });
                }
            }
            catch (e) {
                // ignore network errors — bridge must be resilient
            }
        }
    }
    catch (e) {
        // Never allow exceptions to bubble — bridge must be fire-and-forget
        // eslint-disable-next-line no-console
        console.error('workspaceBridgeOnTransaction error:', e);
    }
}
//# sourceMappingURL=workspace-bridge.js.map