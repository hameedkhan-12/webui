// apps/web/src/app/providers.tsx
'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // Clerk will handle AsyncLocalStorage internally
  // If running in WebContainer, Clerk gracefully falls back
  //
  // NOTE: this used to also mount <AuraBootstrap /> here, which booted the
  // @aura/kernel component/schema registries for the ContentNode/Canvas
  // system. That system (packages/renderer, AuraCanvas.tsx,
  // SchemaInspectorPanel.tsx, the /aura/tree/:projectId persistence) has
  // been retired in favor of a code-as-truth architecture: the AI always
  // writes real files, and any element becomes editable via
  // @aura/ast-engine + the existing InspectorPanel.tsx / webcontainer.ts
  // pipeline, with no separate registry/schema bootstrapping required.
  return (
    <ClerkProvider>
      {children}
    </ClerkProvider>
  );
}