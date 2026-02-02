// apps/api/inngest/functions/ai-modification.ts

import { inngest } from '../client';
import { prisma, JobStatus } from '@webra/database';

export const aiModificationFunction = inngest.createFunction(
  { id: 'ai-modification', retries: 3 },
  { event: 'ai/modification' },
  async ({ event, step }) => {
    const { jobId, userId, projectId, elementId, prompt, context } = event.data;

    await step.run('update-status', async () => {
      return prisma.aIGenerationJob.update({
        where: { id: jobId },
        data: { status: JobStatus.PROCESSING },
      });
    });

    const aiResult = await step.run('call-claude-api', async () => {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2048,
          system: `You are modifying element ID: ${elementId}. 
          
Current context: ${JSON.stringify(context, null, 2)}

Return ONLY JSON with modifications:
{
  "elementId": "${elementId}",
  "changes": {
    "props": {},
    "styles": {}
  }
}`,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.statusText}`);
      }

      return response.json();
    });

    const modifications = await step.run('parse-modifications', async () => {
      const text = aiResult.content[0].text;
      const cleaned = text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { changes: {} };
    });

    await step.run('save-result', async () => {
      return prisma.aIGenerationJob.update({
        where: { id: jobId },
        data: {
          status: JobStatus.COMPLETED,
          result: modifications as any,
        },
      });
    });

    return { success: true, jobId, modifications };
  },
);
