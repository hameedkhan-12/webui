// apps/api/inngest/functions/ai-regeneration.ts

import { inngest } from '../client';

export const aiRegenerationFunction = inngest.createFunction(
  { id: 'ai-regeneration', retries: 3 },
  { event: 'ai/regeneration' },
  async ({ event }) => {
    const { jobId, originalJobId, userId, prompt, context } = event.data;

    // Reuse the generation logic
    await inngest.send({
      name: 'ai/generation',
      data: {
        jobId,
        userId,
        prompt,
        context: {
          ...context,
          originalJobId,
          isRegeneration: true,
        },
      },
    });

    return { success: true, jobId };
  }
);