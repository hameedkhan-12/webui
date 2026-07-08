// apps/api/inngest/functions/ai-generation.ts

import { inngest } from '../client';
import { PrismaClient } from '@webra/database';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

  return `You are a world-class principal React / Next.js engineer. The user wants you to build or edit a web application.

User request: "${prompt}"${fileContext}

Return ONLY a valid JSON object in this exact shape — no markdown, no explanation:
{
  "message": "A short 1-sentence summary of what you did",
  "statusLogs": ["Step 1 done", "Step 2 done"],
  "fileUpdates": {
    "src/app/page.tsx": "/* full file content here */",
    "src/components/SomeComponent.tsx": "/* full file content */"
  }
}

Rules (Bolt.ai Professional Standard):
1. Visual Excellence & Aesthetics:
   - Deliver stunning, professional UI out-of-the-box. Avoid simple gray wireframes or basic styling.
   - Use a gorgeous dark/semi-dark glassmorphism design by default: deep slate/zinc backgrounds (e.g., bg-[#0b0f19] or bg-slate-950), glowing gradients, and ultra-thin borders (border border-white/10).
   - Use curated color accents: Indigo, Violet, Purple, Amber, Emerald, and Rose.
   - Implement premium UI typography with clean spacing and smooth hover/active scaling transitions (e.g. transition-all hover:scale-[1.02] active:scale-95).
   - Use the "lucide-react" package for modern, high-fidelity vector icons. Make sure to import them individually.

2. Architecture & File Structure:
   - Put main layout/routing in "src/app/page.tsx".
   - Break down sub-components cleanly and put them under "src/components/" (e.g., "src/components/Sidebar.tsx", "src/components/Dashboard.tsx").
   - Import sub-components into "src/app/page.tsx" using relative paths (e.g. import { Sidebar } from '../components/Sidebar').

3. Rich Functionality & Interactive State:
   - NEVER use placeholder text or comments like "todo: implement". Everything must be fully functional.
   - Provide highly rich, realistic mock data for lists, charts, and statistics.
   - Make the UI fully interactive! Use React "useState" for filters, tabs, search functionality, modals, adding/deleting list items, and interactive charts/graphs.
   - Always put "use client" at the very top of components using hooks or click handlers.

4. Critical Version Requirements for WebContainer Compatibility:
   - If generating or updating package.json, ALWAYS use these exact, pinned versions (do NOT use ranges or "latest"):
     * "next": "15.4.1"
     * "react": "18.2.0"
     * "react-dom": "18.2.0"
     * "typescript": "5.3.3"
     * "tailwindcss": "3.4.4"
     * "@types/react": "18.2.65"
     * "@types/node": "20.11.5"
   - Do NOT use "next/headers" or server actions that call headers() or cookies() since they are incompatible with the WebContainer AsyncLocalStorage.
   - Do NOT use "next/font" (requires Node.js native font subsetting not in WebContainer).
   - Prefer 'use client' components for all interactive elements.

5. Format & Deliverables:
   - Return ONLY the exact JSON object described above.
   - No pre-text or post-text explanation outside the JSON.
   - All relative paths in "fileUpdates" must contain complete, production-ready, compiling code.`;
}

export function parseGeminiResponse(
  text: string,
  prompt: string,
): {
  message: string;
  statusLogs: string[];
  fileUpdates: Record<string, string>;
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
