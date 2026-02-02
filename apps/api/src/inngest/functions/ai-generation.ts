// apps/api/inngest/functions/ai-generation.ts

import { inngest } from '../client';
import { prisma, JobStatus } from '@webra/database';

export const aiGenerationFunction = inngest.createFunction(
  {
    id: 'ai-generation',
    retries: 3,
    cancelOn: [
      {
        event: 'ai/generation.cancelled',
        match: 'data.jobId',
      },
    ],
  },
  { event: 'ai/generation' },
  async ({ event, step }) => {
    const { jobId, userId, projectId, prompt, context } = event.data;
    console.log('Received AI generation event:', event.data);

    await step.run('update-status-processing', async () => {
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
          max_tokens: 4096,
          system: buildSystemPrompt(context),
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Claude API error: ${response.status} - ${error}`);
      }

      return response.json();
    });

    const parsedResult = await step.run('parse-ai-response', async () => {
      return parseClaudeResponse(aiResult.content[0].text);
    });

    await step.run('save-result', async () => {
      return prisma.aIGenerationJob.update({
        where: { id: jobId },
        data: {
          status: JobStatus.COMPLETED,
          result: parsedResult as any,
        },
      });
    });

    if (projectId) {
      await step.run('create-version', async () => {
        const latestVersion = await prisma.projectVersion.findFirst({
          where: { projectId },
          orderBy: { version: 'desc' },
        });

        return prisma.projectVersion.create({
          data: {
            projectId,
            version: (latestVersion?.version || 0) + 1,
            snapshot: parsedResult as any,
            message: `AI generated: ${prompt.substring(0, 100)}`,
            createdBy: userId,
          },
        });
      });
    }

    await step.run('send-notification', async () => {
      await inngest.send({
        name: 'notification/send',
        data: {
          userId,
          type: 'ai_generation_complete',
          message: 'Your AI generation is complete',
          jobId,
        },
      });
    });

    return { success: true, jobId, result: parsedResult };
  },
);

function buildSystemPrompt(context: any): string {
  return `You are an expert UI/UX designer and frontend developer. Generate React components based on user descriptions.

Context: ${JSON.stringify(context, null, 2)}

Return ONLY valid JSON with this structure:
{
  "elements": [
    {
      "id": "unique-id",
      "type": "container|text|image|button|etc",
      "props": {},
      "styles": {},
      "children": []
    }
  ],
  "styles": {
    "fontFamily": "Inter, sans-serif",
    "primaryColor": "#0066cc"
  }
}

Important:
- Return ONLY the JSON, no markdown, no explanations
- Use semantic HTML elements
- Include responsive styles
- Make it modern and accessible`;
}

function parseClaudeResponse(text: string): any {
  try {
    // Remove markdown code blocks if present
    const cleaned = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Try to find JSON object
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // Fallback
    return {
      elements: [],
      styles: {},
      error: 'Could not parse AI response',
      rawResponse: text,
    };
  } catch (error) {
    console.error('Failed to parse Claude response:', error);
    return {
      elements: [],
      styles: {},
      error: 'Failed to parse AI response',
      rawResponse: text,
    };
  }
}
