// packages/ast-engine/src/babel-interop.ts
/**
 * @babel/traverse ships as CommonJS with a `.default` property (a common dual
 * CJS/ESM-compat pattern), but different module loaders resolve `import *
 * as X from '@babel/traverse'` differently depending on how they detect CJS
 * named exports:
 *
 * - Under plain `require()`, `traverseModule.default` is reliably the real
 *   traverse function.
 * - Under some native-ESM / bundler resolution paths (confirmed via a direct
 *   Node ESM repro, NOT caught by this package's own Vitest suite -- Vitest's
 *   module transform happens to normalize this differently than a real
 *   consuming app's bundler does), `traverseModule.default` can end up NOT
 *   being a function, silently making every traverse() call throw
 *   "traverse is not a function" at actual runtime.
 *
 * This resolves defensively across every shape we've actually observed,
 * rather than assuming one specific interop pattern.
 */
import * as traverseModule from '@babel/traverse'

function resolveTraverse(): typeof import('@babel/traverse').default {
  const mod = traverseModule as unknown as Record<string, unknown>

  if (typeof mod === 'function') {
    return mod as typeof import('@babel/traverse').default
  }
  if (typeof mod.default === 'function') {
    return mod.default as typeof import('@babel/traverse').default
  }
  // Double-wrapped default (a known CJS/ESM interop quirk) -- some loaders
  // wrap an already-CJS-compat module's `.default` again.
  const nested = mod.default as Record<string, unknown> | undefined
  if (nested && typeof nested.default === 'function') {
    return nested.default as typeof import('@babel/traverse').default
  }

  throw new Error(
    '[@aura/ast-engine] Could not resolve a callable @babel/traverse export. ' +
      `Got shape: ${JSON.stringify(Object.keys(mod))}. This means the CJS/ESM ` +
      'interop pattern in the current runtime differs from every shape this ' +
      'package has handled so far -- this needs a real fix, not a silent fallback.'
  )
}

export const traverse = resolveTraverse()