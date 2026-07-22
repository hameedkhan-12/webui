// apps/api/inngest/functions/ai-generation.ts

import { inngest } from '../client';
import { PrismaClient } from '@webra/database';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { BLOCK_MANIFEST } from '@aura/blocks/manifest';

// Create a prisma instance for use in Inngest functions
const prisma = new PrismaClient();

// Initialize Gemini — model name is set by the user's API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

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

    console.log(
      '[ai-generation] Starting job:',
      jobId,
      '| prompt:',
      prompt?.substring(0, 80),
    );

    try {
      if (!prompt) {
        throw new Error(
          "Missing required field 'prompt' in AI generation event.",
        );
      }

      if (!jobId || !userId) {
        throw new Error(
          `Missing required fields. jobId: ${jobId}, userId: ${userId}.`,
        );
      }

      if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not set.');
      }

      // ── Step 1: Mark job as processing ──────────────────────────────────────
      await step.run('update-status-processing', async () => {
        return prisma.aIGenerationJob.update({
          where: { id: jobId },
          data: { status: 'PROCESSING' as JobStatus },
        });
      });

      // ── Step 2: Call Gemini ─────────────────────────────────────────────────
      const aiResult = await step.run('call-gemini-api', async () => {
        const systemPrompt = buildCodeGenPrompt(prompt, context);
        const result = await model.generateContent(systemPrompt);
        return { text: result.response.text() };
      });

      // ── Step 3: Parse the response into fileUpdates ─────────────────────────
      const parsedResult = await step.run('parse-ai-response', async () => {
        return parseGeminiResponse(aiResult.text, prompt);
      });

      // ── Step 4: Save result ─────────────────────────────────────────────────
      await step.run('save-result', async () => {
        return prisma.aIGenerationJob.update({
          where: { id: jobId },
          data: {
            status: 'COMPLETED' as JobStatus,
            result: parsedResult as any,
          },
        });
      });

      // ── Step 5: Create project version snapshot ─────────────────────────────
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

      return { success: true, jobId, result: parsedResult };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('[ai-generation] Error:', errorMessage);

      if (jobId) {
        try {
          await prisma.aIGenerationJob.update({
            where: { id: jobId },
            data: {
              status: 'FAILED' as JobStatus,
              result: {
                error: errorMessage,
                timestamp: new Date().toISOString(),
              } as any,
            },
          });
        } catch (dbError) {
          console.error(
            '[ai-generation] Failed to update job status:',
            dbError,
          );
        }
      }

      throw error;
    }
  },
);

export function buildCodeGenPrompt(prompt: string, context: any): string {
  const existingFiles: Array<{ path: string; content: string }> =
    context?.files ?? [];

  const fileContext =
    existingFiles.length > 0
      ? `\n\nExisting project files (for context):\n${existingFiles
          .map((f) => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
          .join('\n\n')}`
      : '';

  // Generate serialized blocks manifest for prompt context
  const blocksContext = BLOCK_MANIFEST.map(item => {
    const fields = item.schema.fields.map(f => {
      const opts = f.options ? ` (options: ${f.options.map(o => o.value).join('|')})` : '';
      return `  - ${f.key}: ${f.type}${opts}${f.required ? ' (required)' : ''} [default: ${JSON.stringify(f.defaultValue)}]`;
    }).join('\n');
    const slots = item.meta.slots && item.meta.slots.length > 0
      ? `Slots: ${item.meta.slots.map(s => s.key).join(', ')}`
      : '';

    return `* BlockType: "${item.blockType}" ("${item.displayName}")
  Description: ${item.meta.description}
  ${slots ? slots + '\n  ' : ''}Fields:
${fields}`;
  }).join('\n\n');

  return `You are a world-class principal React / Next.js design engineer. The user wants you to build or edit a web application.

You have access to a set of pre-registered visual blocks that can be composed into a content tree.

AVAILABLE REGISTERED BLOCKS FOR COMPOSING:
${blocksContext}

User request: "${prompt}"${fileContext}

You can choose between TWO response modes based on the user's request:

MODE A: Content Tree Operations (Preferred for layout composition)
If the user's request maps cleanly to arranging, configuring, inserting, or updating the pre-registered blocks (e.g. adding cards to a grid, changing hero text, creating forms, putting sections together), you MUST respond with "treeOps" array and NO "fileUpdates".
Return ONLY this exact JSON structure:
{
  "message": "A short 1-sentence summary of what you did",
  "statusLogs": ["Inserted Section", "Added Card inside Grid"],
  "treeOps": [
    {
      "kind": "insert",
      "parentId": "parent-node-id-string" or null for root-level,
      "slot": "children",
      "node": {
        "id": "unique-stable-id-string",
        "type": "BlockType",
        "props": {
          "propKey": "propValue"
        },
        "children": []
      }
    },
    {
      "kind": "updateProps",
      "nodeId": "existing-node-id-string",
      "props": {
        "propKey": "newPropValue"
      }
    }
  ]
}

MODE B: Raw File Generation (Fallback for custom code/logic)
If the user's request CANNOT be achieved by composing the registered blocks (e.g., custom animations, custom utility scripts, third-party library integrations, complex state logic, non-visual code), you MUST fallback to generating full files in "fileUpdates" as usual.
Return ONLY this exact JSON structure:
{
  "message": "A short 1-sentence summary of what you did",
  "statusLogs": ["Step 1 done", "Step 2 done"],
  "fileUpdates": {
    "src/app/page.tsx": "/* full file content here */",
    "src/components/SomeComponent.tsx": "/* full file content */"
  }
}

Rules:
1. NEVER mix "treeOps" and "fileUpdates" in the same response.
2. For MODE A, ensure all nested nodes generated have a unique, stable, non-random string "id" (e.g. "pricing-section", "pricing-grid", "card-1").
3. For MODE A, check the schemas of the BlockTypes and ensure all fields are set with correct types matching the schema field definitions.
4. Return ONLY raw JSON. Do not include markdown code block syntax.`;
}

export function parseGeminiResponse(
  text: string,
  prompt: string,
): {
  message: string;
  statusLogs: string[];
  fileUpdates: Record<string, string>;
  treeOps?: any[];
} {
  try {
    // Strip markdown fences if Gemini wraps the JSON
    const cleaned = text
      .replace(/^```(?:json)?\s*/im, '')
      .replace(/\s*```$/im, '')
      .trim();

    // Find the outermost JSON object
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('No JSON object found');

    const parsed = JSON.parse(cleaned.slice(start, end + 1));

    return {
      message: parsed.message ?? `Generated: ${prompt.substring(0, 60)}`,
      statusLogs: Array.isArray(parsed.statusLogs)
        ? parsed.statusLogs
        : ['Done'],
      fileUpdates:
        parsed.fileUpdates && typeof parsed.fileUpdates === 'object'
          ? parsed.fileUpdates
          : {},
      treeOps:
        Array.isArray(parsed.treeOps)
          ? parsed.treeOps
          : undefined,
    };
  } catch (error) {
    console.error('[ai-generation] Failed to parse Gemini response:', error);
    console.error(
      '[ai-generation] Raw text (first 500 chars):',
      text?.substring(0, 500),
    );

    // Return the raw text as a single file so the user can at least see what came back
    return {
      message: 'AI responded but the output could not be parsed as JSON',
      statusLogs: ['Parse error — raw response saved to src/ai-response.txt'],
      fileUpdates: {
        'src/ai-response.txt': text ?? '(empty response)',
      },
    };
  }
}
