'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { ReactNode } from 'react';
import { AuraBootstrap } from '@/components/AuraBootstrap';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // Clerk will handle AsyncLocalStorage internally
  // If running in WebContainer, Clerk gracefully falls back
  return (
    <ClerkProvider>
      <AuraBootstrap />
      {children}
    </ClerkProvider>
  );
}