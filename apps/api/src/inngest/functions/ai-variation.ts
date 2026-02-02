// apps/api/inngest/functions/ai-variation.ts

import { prisma } from '@webra/database';
import { inngest } from '../client';
export const aiVariationFunction = inngest.createFunction(
  { id: 'ai-variation', retries: 3 },
  { event: 'ai/variation' },
  async ({ event, step }) => {
    const { jobId, userId, variationIndex, baseJobId, context } = event.data;

    // Get base job if exists
    let basePrompt = `Generate variation ${variationIndex}`;

    if (baseJobId) {
      const baseJob = await step.run('get-base-job', async () => {
        return prisma.aIGenerationJob.findUnique({
          where: { id: baseJobId },
        });
      });

      if (baseJob) {
        basePrompt = `${baseJob.prompt} (Variation ${variationIndex})`;
      }
    }

    // Trigger generation with variation context
    await inngest.send({
      name: 'ai/generation',
      data: {
        jobId,
        userId,
        prompt: basePrompt,
        context: {
          ...context,
          isVariation: true,
          variationIndex,
          baseJobId,
        },
      },
    });

    return { success: true, jobId, variationIndex };
  },
);
