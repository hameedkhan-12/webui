'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // Clerk will handle AsyncLocalStorage internally
  // If running in WebContainer, Clerk gracefully falls back
  return (
    <ClerkProvider>
      {children}
    </ClerkProvider>
  );
}
