'use client'

import dynamic from 'next/dynamic'

/**
 * Phase 2 canvas route: /project/[projectId]/canvas
 *
 * Renders the Aura block canvas — a JSON content tree (Nav > Hero >
 * Grid[Card×3] > Footer) rendered via @aura/renderer's Canvas, with
 * click-to-select wired through DesignModeProvider + SelectionOverlay.
 *
 * Loaded with ssr: false so the canvas only runs in the browser; the Aura
 * runtime is client-side only (it references ComponentType/React at runtime).
 */
const AuraCanvas = dynamic(
  () => import('../../../../components/AuraCanvas').then(m => ({ default: m.AuraCanvas })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-full items-center justify-center bg-[#070913]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-indigo-500" />
          <p className="text-xs text-slate-500 tracking-widest uppercase">
            Loading canvas…
          </p>
        </div>
      </div>
    ),
  }
)

export default function CanvasPage() {
  return <AuraCanvas />
}
