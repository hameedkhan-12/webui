// src/providers/clerk-client.provider.ts

import { createClerkClient } from '@clerk/backend';
import { getConfig } from '@repo/shared';

export const ClerkClientProvider = {
  provide: 'ClerkClient',
  useFactory: () => {
    const config = getConfig();
    return createClerkClient({
      publishableKey: config.clerk.publishableKey,
      secretKey: config.clerk.secretKey,
    });
  },
};