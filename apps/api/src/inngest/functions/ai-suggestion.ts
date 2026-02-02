// apps/api/inngest/functions/ai-suggestions.ts

import { inngest } from '../client';
import { prisma, JobStatus } from '@webra/database';

export const aiSuggestionsFunction = inngest.createFunction(
  { id: 'ai-suggestions', retries: 2 },
  { event: 'ai/suggestions' },
  async ({ event, step }) => {
    const { jobId, userId, projectId, suggestionType, context } = event.data;

    await step.run('update-status', async () => {
      return prisma.aIGenerationJob.update({
        where: { id: jobId },
        data: { status: JobStatus.PROCESSING },
      });
    });

    const suggestions = await step.run('generate-suggestions', async () => {
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
          system: `Generate 3-5 ${suggestionType} suggestions for this design.

Context: ${JSON.stringify(context, null, 2)}

Return ONLY JSON array:
[
  {
    "type": "${suggestionType}",
    "title": "Suggestion title",
    "description": "Why this improves the design",
    "preview": {}
  }
]`,
          messages: [{
            role: 'user',
            content: `Generate ${suggestionType} suggestions`
          }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.statusText}`);
      }

      const result = await response.json();
      const text = result.content[0].text;
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    });

    await step.run('save-suggestions', async () => {
      return prisma.aIGenerationJob.update({
        where: { id: jobId },
        data: {
          status: JobStatus.COMPLETED,
          result: { suggestions } as any,
        },
      });
    });

    return { success: true, jobId, suggestions };
  }
);