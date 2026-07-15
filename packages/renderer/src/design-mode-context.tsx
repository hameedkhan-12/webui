import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react'

export interface DesignModeState {
  readonly enabled: boolean
  readonly hoveredId: string | null
  readonly selectedId: string | null
  hover(id: string | null): void
  select(id: string | null): void
}

const DesignModeContext = createContext<DesignModeState | null>(null)

export function DesignModeProvider({
  enabled,
  onSelectionChange,
  children
}: {
  readonly enabled: boolean
  /** Fired whenever selection changes -- Phase 3's inspector panel hooks in here. */
  readonly onSelectionChange?: (id: string | null) => void
  readonly children: ReactNode
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const value = useMemo<DesignModeState>(
    () => ({
      enabled,
      hoveredId,
      selectedId,
      hover: setHoveredId,
      select: (id: string | null) => {
        setSelectedId(id)
        onSelectionChange?.(id)
      }
    }),
    [enabled, hoveredId, selectedId, onSelectionChange]
  )

  return (
    <DesignModeContext.Provider value={value}>
      {children}
    </DesignModeContext.Provider>
  )
}

export function useDesignMode(): DesignModeState {
  const ctx = useContext(DesignModeContext)
  if (!ctx) {
    throw new Error(
      'useDesignMode() was called outside <DesignModeProvider>.'
    )
  }
  return ctx
}