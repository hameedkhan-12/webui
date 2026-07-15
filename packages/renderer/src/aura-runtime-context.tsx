import { createContext, useContext, type ReactNode } from 'react'
import type { AuraRuntime } from '@aura/blocks'

const AuraRuntimeContext = createContext<AuraRuntime | null>(null)

export function AuraRuntimeProvider({
  runtime,
  children
}: {
  readonly runtime: AuraRuntime
  readonly children: ReactNode
}) {
  return (
    <AuraRuntimeContext.Provider value={runtime}>
      {children}
    </AuraRuntimeContext.Provider>
  )
}

export function useAuraRuntime(): AuraRuntime {
  const runtime = useContext(AuraRuntimeContext)
  if (!runtime) {
    throw new Error(
      'useAuraRuntime() was called outside <AuraRuntimeProvider>. ' +
      'Call bootstrapAura() once and wrap your canvas in the provider.'
    )
  }
  return runtime
}