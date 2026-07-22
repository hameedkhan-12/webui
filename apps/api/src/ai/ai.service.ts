// apps/api/src/modules/ai/ai.service.ts

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JobStatus } from '@webra/database';
import { InngestService } from '../inngest/inngest.service';
import { WorkspaceService } from '../workspace/workspace.service';
import {
  buildCodeGenPrompt,
  parseGeminiResponse,
} from '../inngest/functions/ai-generation';
import {
  GenerateDto,
  ModifyDto,
  RegenerateDto,
  SuggestionsDto,
  VariationsDto,
} from './dto/ai.dto';

@Injectable()
export class AiService {
  constructor(
    private prisma: PrismaService,
    private inngest: InngestService,
    private workspaceService: WorkspaceService,
  ) {}

  /**
   * Helper method to get user from clerkId and convert to database userId
   * This is necessary because Clerk uses clerkId but our database relations use the internal user.id
   */
  private async getUserFromClerkId(clerkId: string) {
    const user = await this.prisma.user.findUnique({
      where: { clerkId },
      select: { id: true, clerkId: true, email: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async generate(clerkId: string, dto: GenerateDto) {
    const user = await this.getUserFromClerkId(clerkId);

    // Validate project if provided
    let projectId = dto.projectId;
    if (projectId) {
      const project = await this.validateProjectAccess(user.id, projectId);
      projectId = project.id;
    }

    // Build full context: merge explicit context + file entries from frontend
    const fullContext = {
      ...(dto.context || {}),
      ...(dto.entries?.length ? { files: dto.entries } : {}),
    };

    // Create AI generation job
    const job = await this.prisma.aIGenerationJob.create({
      data: {
        userId: user.id,
        projectId: projectId,
        prompt: dto.prompt,
        context: fullContext as any,
        jobType: 'generate',
        status: JobStatus.PENDING,
      },
    });

    // Send to Inngest
    await this.inngest.send({
      name: 'ai/generation',
      data: {
        jobId: job.id,
        userId: user.id,
        projectId: projectId,
        prompt: dto.prompt,
        context: fullContext,
      },
    });

    // Trigger direct execution fallback in case Inngest is not active in this development environment
    void this.runGenerationDirectly(job.id, user.id, projectId, dto.prompt, fullContext);

    return {
      jobId: job.id,
      status: job.status,
      message: 'Generation job created successfully',
    };
  }

  async generateStream(clerkId: string, dto: GenerateDto, res: any) {
    const user = await this.getUserFromClerkId(clerkId);

    // Validate project if provided
    let projectId = dto.projectId;
    if (projectId) {
      const project = await this.validateProjectAccess(user.id, projectId);
      projectId = project.id;
    }

    // Build full context: merge explicit context + file entries from frontend
    const fullContext = {
      ...(dto.context || {}),
      ...(dto.entries?.length ? { files: dto.entries } : {}),
    };

    // Create AI generation job
    const job = await this.prisma.aIGenerationJob.create({
      data: {
        userId: user.id,
        projectId: projectId,
        prompt: dto.prompt,
        context: fullContext as any,
        jobType: 'generate',
        status: JobStatus.PROCESSING,
      },
    });

    const sendEvent = (type: 'file' | 'status' | 'done' | 'error', data: any) => {
      res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
    };

    sendEvent('status', { message: 'AI is starting code generation...' });

    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured in NestJS backend.');
      }

      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

      const systemPrompt = buildCodeGenPrompt(dto.prompt, fullContext);
      sendEvent('status', { message: 'Contacting Gemini model...' });

      const resultStream = await model.generateContentStream(systemPrompt);

      let fullText = '';
      const fileUpdates: Record<string, string> = {};

      const parser = new StreamingJsonParser(
        (path, content, isComplete) => {
          if (isComplete) {
            fileUpdates[path] = content;
            sendEvent('file', { path, content, isComplete: true });
          }
        }
      );

      for await (const chunk of resultStream.stream) {
        const chunkText = chunk.text();
        fullText += chunkText;
        parser.write(chunkText);
      }
      parser.flush();

      // Parse final output to make sure it's complete & valid
      const parsedResult = parseGeminiResponse(fullText, dto.prompt);

      if (parsedResult.treeOps) {
        const { validateTreeOperations } = await import('./tree-op-validator.js');
        const validation = validateTreeOperations(parsedResult.treeOps);
        if (validation.valid) {
          sendEvent('tree-op', { ops: validation.ops });

          // Update job status in DB
          await this.prisma.aIGenerationJob.update({
            where: { id: job.id },
            data: {
              status: JobStatus.COMPLETED,
              result: parsedResult as any,
            },
          });

          sendEvent('done', { message: parsedResult.message || 'Generation complete!' });
          return;
        } else {
          console.warn('[AiService] tree-op validation failed:', validation.reason);
          sendEvent('status', { message: `⚠️ Tree-op validation failed: ${validation.reason}. Falling back to file generation...` });
        }
      }

      // Ensure all files in parsed result are sent
      for (const [path, content] of Object.entries(parsedResult.fileUpdates)) {
        if (!parser.parsedFiles.has(path)) {
          fileUpdates[path] = content;
          sendEvent('file', { path, content, isComplete: true });
        }
      }

      // Update job status in DB
      await this.prisma.aIGenerationJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.COMPLETED,
          result: parsedResult as any,
        },
      });

      // Create project version snapshot
      if (projectId) {
        const latestVersion = await this.prisma.projectVersion.findFirst({
          where: { projectId },
          orderBy: { version: 'desc' },
        });

        await this.prisma.projectVersion.create({
          data: {
            projectId,
            version: (latestVersion?.version || 0) + 1,
            snapshot: parsedResult as any,
            message: `AI generated: ${dto.prompt.substring(0, 100)}`,
            createdBy: user.id,
          },
        });

        // ── Persist generated files directly to WorkspaceEntry ──────────────
        // This is the authoritative DB write. Even if the frontend autosave
        // is delayed or never fires, the files will be correctly associated
        // with this project the next time it is loaded.
        const generatedFiles = Object.entries(parsedResult.fileUpdates);
        if (generatedFiles.length > 0) {
          try {
            await this.prisma.$transaction(async (tx) => {
              // Load current entries so we can merge (not replace) the workspace
              const existing = await tx.workspaceEntry.findMany({
                where: { projectId },
                select: { path: true, content: true, kind: true },
              });

              // Build a map: existing paths → entry, then overlay generated files
              const entryMap = new Map(
                existing.map((e) => [e.path, { content: e.content, kind: e.kind }])
              );
              for (const [path, content] of generatedFiles) {
                entryMap.set(path, { content, kind: 'file' });
              }

              // Atomically replace all workspace entries for this project
              await tx.workspaceEntry.deleteMany({ where: { projectId } });
              await tx.workspaceEntry.createMany({
                data: Array.from(entryMap.entries()).map(([path, data]) => ({
                  projectId,
                  path,
                  content: data.content,
                  kind: data.kind,
                })),
              });

              // Touch project.updatedAt
              await tx.project.update({
                where: { id: projectId },
                data: { updatedAt: new Date() },
              });
            });
            sendEvent('status', { message: `✅ ${generatedFiles.length} file(s) saved to project.` });
            console.log(`[AiService] Persisted ${generatedFiles.length} generated files to WorkspaceEntry for project ${projectId}`);
          } catch (persistErr: any) {
            // Non-fatal — the client's saveImmediately will also attempt a save
            console.error('[AiService] Failed to persist WorkspaceEntries:', persistErr?.message);
          }
        }
      }

      sendEvent('done', { message: parsedResult.message || 'Generation complete!' });

    } catch (err: any) {
      console.error('[AiService.generateStream] Error:', err);
      
      await this.prisma.aIGenerationJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.FAILED,
          error: err?.message || String(err),
        },
      }).catch((e) => console.error('Failed to update job status to FAILED:', e));

      sendEvent('error', { message: err?.message || String(err) });
      throw err;
    }
  }

  async runGenerationDirectly(
    jobId: string,
    userId: string,
    projectId: string | undefined,
    prompt: string,
    context: any,
  ) {
    // Wait a brief moment (1.5 seconds) to allow Inngest to trigger if it is running
    await new Promise((resolve) => setTimeout(resolve, 1500));

    try {
      // Re-fetch job status to see if Inngest picked it up
      const currentJob = await this.prisma.aIGenerationJob.findUnique({
        where: { id: jobId },
      });

      if (!currentJob || currentJob.status !== JobStatus.PENDING) {
        // Already processing or completed by Inngest, do nothing
        return;
      }

      console.log('[AiService] Direct background fallback triggered for job:', jobId);

      // ── Step 1: Update status to PROCESSING ──
      await this.prisma.aIGenerationJob.update({
        where: { id: jobId },
        data: { status: JobStatus.PROCESSING },
      });

      // ── Step 2: Initialize Gemini ──
      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured in NestJS backend.');
      }

      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

      // ── Step 3: Run prompt generation ──
      const systemPrompt = buildCodeGenPrompt(prompt, context);
      const geminiResult = await model.generateContent(systemPrompt);
      const rawText = geminiResult.response.text();

      // Check if user cancelled the job mid-generation
      const checkCancelled = await this.prisma.aIGenerationJob.findUnique({
        where: { id: jobId },
      });
      if (checkCancelled?.error === 'Cancelled by user' || checkCancelled?.status === JobStatus.FAILED) {
        console.log('[AiService] Job was cancelled by user mid-fallback-execution:', jobId);
        return;
      }

      // ── Step 4: Parse the output ──
      const parsedResult = parseGeminiResponse(rawText, prompt);

      // ── Step 5: Save result to DB & Complete ──
      await this.prisma.aIGenerationJob.update({
        where: { id: jobId },
        data: {
          status: JobStatus.COMPLETED,
          result: parsedResult as any,
        },
      });

      // ── Step 6: Create version snapshot ──
      if (projectId) {
        const latestVersion = await this.prisma.projectVersion.findFirst({
          where: { projectId },
          orderBy: { version: 'desc' },
        });

        await this.prisma.projectVersion.create({
          data: {
            projectId,
            version: (latestVersion?.version || 0) + 1,
            snapshot: parsedResult as any,
            message: `AI generated (fallback): ${prompt.substring(0, 100)}`,
            createdBy: userId,
          },
        });
      }

      console.log('[AiService] Direct background fallback finished successfully for job:', jobId);
    } catch (err: any) {
      console.error('[AiService] Direct background fallback failed:', err);
      try {
        const checkCancelled = await this.prisma.aIGenerationJob.findUnique({
          where: { id: jobId },
        });
        if (checkCancelled && checkCancelled.status !== JobStatus.FAILED) {
          await this.prisma.aIGenerationJob.update({
            where: { id: jobId },
            data: {
              status: JobStatus.FAILED,
              error: err?.message || String(err),
            },
          });
        }
      } catch (dbErr) {
        console.error('[AiService] Failed to set failure status in database:', dbErr);
      }
    }
  }

  async modify(clerkId: string, dto: ModifyDto) {
    const user = await this.getUserFromClerkId(clerkId);
    const project = await this.validateProjectAccess(user.id, dto.projectId);

    const fullProject = await this.prisma.project.findUnique({
      where: { id: project.id },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!fullProject) {
      throw new NotFoundException('Project not found');
    }

    const job = await this.prisma.aIGenerationJob.create({
      data: {
        userId: user.id,
        projectId: project.id,
        prompt: dto.prompt,
        context: {
          ...dto.context,
          elementId: dto.elementId,
        },
        jobType: 'modify',
        status: JobStatus.PENDING,
      },
    });

    // Send to Inngest
    await this.inngest.send({
      name: 'ai/modification',
      data: {
        jobId: job.id,
        userId: user.id,
        projectId: project.id,
        elementId: dto.elementId,
        prompt: dto.prompt,
        context: job.context as any,
      },
    });

    return {
      jobId: job.id,
      status: job.status,
      message: 'Modification job created successfully',
    };
  }

  async getSuggestions(clerkId: string, dto: SuggestionsDto) {
    const user = await this.getUserFromClerkId(clerkId);
    const project = await this.validateProjectAccess(user.id, dto.projectId);

    const fullProject = await this.prisma.project.findUnique({
      where: { id: project.id },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!fullProject) {
      throw new NotFoundException('Project not found');
    }

    const job = await this.prisma.aIGenerationJob.create({
      data: {
        userId: user.id,
        projectId: project.id,
        prompt: `Generate ${dto.suggestionType || 'design'} suggestions`,
        context: {
          ...dto.context,
          suggestionType: dto.suggestionType,
          currentSnapshot: fullProject.versions[0]?.snapshot,
        },
        jobType: 'suggestions',
        status: JobStatus.PENDING,
      },
    });

    // Send to Inngest
    await this.inngest.send({
      name: 'ai/suggestions',
      data: {
        jobId: job.id,
        userId: user.id,
        projectId: project.id,
        suggestionType: dto.suggestionType,
        context: job.context as any,
      },
    });

    return {
      jobId: job.id,
      status: job.status,
      message: 'Suggestions job created successfully',
    };
  }

  async getJobStatus(clerkId: string, jobId: string) {
    const user = await this.getUserFromClerkId(clerkId);

    const job = await this.prisma.aIGenerationJob.findUnique({
      where: { id: jobId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Verify user has access to this job
    if (job.userId !== user.id) {
      if (job.projectId) {
        await this.validateProjectAccess(user.id, job.projectId);
      } else {
        throw new NotFoundException('Job not found');
      }
    }

    return {
      jobId: job.id,
      // Lowercase status so frontend poll matches 'completed' / 'failed'
      status: job.status.toLowerCase(),
      jobType: job.jobType,
      prompt: job.prompt,
      result: job.result ?? null,
      error: (job as any).error ?? null,
      project: job.project,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }

  async regenerate(clerkId: string, dto: RegenerateDto) {
    const user = await this.getUserFromClerkId(clerkId);

    const originalJob = await this.prisma.aIGenerationJob.findUnique({
      where: { id: dto.jobId },
    });

    if (!originalJob) {
      throw new NotFoundException('Original job not found');
    }

    if (originalJob.userId !== user.id) {
      throw new NotFoundException('Job not found');
    }

    const newJob = await this.prisma.aIGenerationJob.create({
      data: {
        userId: user.id,
        projectId: originalJob.projectId,
        prompt: dto.prompt || originalJob.prompt,
        context: originalJob.context as any,
        jobType: 'regenerate',
        status: JobStatus.PENDING,
      },
    });

    // Send to Inngest
    await this.inngest.send({
      name: 'ai/regeneration',
      data: {
        jobId: newJob.id,
        originalJobId: originalJob.id,
        userId: user.id,
        prompt: newJob.prompt,
        context: newJob.context as any,
      },
    });

    return {
      jobId: newJob.id,
      status: newJob.status,
      message: 'Regeneration job created successfully',
    };
  }

  async generateVariations(clerkId: string, dto: VariationsDto) {
    const user = await this.getUserFromClerkId(clerkId);

    let baseJob = await this.prisma.aIGenerationJob.findUnique({
      where: { id: dto.baseId },
    });

    let projectId: string | undefined;

    if (!baseJob) {
      const project = await this.validateProjectAccess(user.id, dto.baseId);
      projectId = project.id;
    } else {
      if (baseJob.userId !== user.id) {
        throw new NotFoundException('Base job not found');
      }
      projectId = baseJob.projectId || undefined;
    }

    const variationCount = dto.variationCount || 3;
    const jobs: any[] = [];

    // Create multiple variation jobs
    for (let i = 0; i < variationCount; i++) {
      const job = await this.prisma.aIGenerationJob.create({
        data: {
          userId: user.id,
          projectId,
          prompt: baseJob?.prompt || `Generate variation ${i + 1}`,
          context: {
            ...(baseJob?.context as any),
            ...dto.parameters,
            variationIndex: i + 1,
            baseJobId: baseJob?.id,
          },
          jobType: 'variations',
          status: JobStatus.PENDING,
        },
      });

      jobs.push(job);

      // Send to Inngest
      await this.inngest.send({
        name: 'ai/variation',
        data: {
          jobId: job.id,
          userId: user.id,
          variationIndex: i + 1,
          baseJobId: baseJob?.id,
          context: job.context as any,
        },
      });
    }

    return {
      jobs: jobs.map((job) => ({
        jobId: job.id,
        status: job.status,
      })),
      message: `${variationCount} variation jobs created successfully`,
    };
  }

  async cancelJob(clerkId: string, jobId: string) {
    const user = await this.getUserFromClerkId(clerkId);

    const job = await this.prisma.aIGenerationJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.userId !== user.id) {
      throw new NotFoundException('Job not found');
    }

    if (job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED) {
      throw new BadRequestException('Cannot cancel completed or failed job');
    }

    await this.prisma.aIGenerationJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.FAILED,
        error: 'Cancelled by user',
      },
    });

    // Send cancellation event to Inngest
    await this.inngest.send({
      name: 'ai/generation.cancelled',
      data: {
        jobId,
      },
    });

    return { message: 'Job cancelled successfully' };
  }

  async getUserJobs(
    clerkId: string,
    options?: {
      status?: JobStatus;
      jobType?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const user = await this.getUserFromClerkId(clerkId);

    const where: any = { userId: user.id };

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.jobType) {
      where.jobType = options.jobType;
    }

    const [jobs, total] = await Promise.all([
      this.prisma.aIGenerationJob.findMany({
        where,
        include: {
          project: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 20,
        skip: options?.offset || 0,
      }),
      this.prisma.aIGenerationJob.count({ where }),
    ]);

    return {
      jobs,
      total,
      limit: options?.limit || 20,
      offset: options?.offset || 0,
    };
  }

  private async validateProjectAccess(userId: string, projectId: string) {
    if (projectId === 'default') {
      return this.workspaceService.getProjectOrFallback(userId, projectId);
    }

    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [{ ownerId: userId }],
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found or access denied');
    }

    return project;
  }
}

class StreamingJsonParser {
  private buffer = '';
  private state: 'searching_file_updates' | 'inside_file_updates' | 'reading_key' | 'waiting_colon' | 'reading_value' = 'searching_file_updates';
  private currentKey = '';
  private currentValue = '';
  private isEscaped = false;
  public parsedFiles = new Set<string>();

  constructor(
    private onFileProgress: (path: string, content: string, isComplete: boolean) => void,
  ) {}

  write(chunk: string) {
    this.buffer += chunk;
    this.processBuffer();
  }

  private processBuffer() {
    if (this.state === 'searching_file_updates') {
      const index = this.buffer.indexOf('"fileUpdates"');
      if (index !== -1) {
        const openBraceIndex = this.buffer.indexOf('{', index + 13);
        if (openBraceIndex !== -1) {
          this.state = 'inside_file_updates';
          this.buffer = this.buffer.slice(openBraceIndex + 1);
        } else {
          return;
        }
      } else {
        return;
      }
    }

    let i = 0;
    while (i < this.buffer.length) {
      const char = this.buffer[i];

      if (this.state === 'inside_file_updates') {
        if (char === '"') {
          this.state = 'reading_key';
          this.currentKey = '';
          this.currentValue = '';
        } else if (char === '}') {
          this.state = 'searching_file_updates';
          this.buffer = this.buffer.slice(i + 1);
          return;
        }
      } else if (this.state === 'reading_key') {
        if (char === '"') {
          this.state = 'waiting_colon';
        } else {
          this.currentKey += char;
        }
      } else if (this.state === 'waiting_colon') {
        if (char === ':') {
          let foundQuoteIndex = -1;
          for (let j = i + 1; j < this.buffer.length; j++) {
            if (this.buffer[j] === '"') {
              foundQuoteIndex = j;
              break;
            }
          }
          if (foundQuoteIndex !== -1) {
            this.state = 'reading_value';
            this.isEscaped = false;
            i = foundQuoteIndex;
          } else {
            this.buffer = this.buffer.slice(i);
            return;
          }
        }
      } else if (this.state === 'reading_value') {
        if (this.isEscaped) {
          if (char === 'n') this.currentValue += '\n';
          else if (char === 't') this.currentValue += '\t';
          else if (char === 'r') this.currentValue += '\r';
          else if (char === 'b') this.currentValue += '\b';
          else if (char === 'f') this.currentValue += '\f';
          else this.currentValue += char;
          this.isEscaped = false;
        } else if (char === '\\') {
          this.isEscaped = true;
        } else if (char === '"') {
          this.onFileProgress(this.currentKey, this.currentValue, true);
          this.parsedFiles.add(this.currentKey);
          this.state = 'inside_file_updates';
          
          let nextStateIndex = i + 1;
          while (nextStateIndex < this.buffer.length) {
            const nextChar = this.buffer[nextStateIndex];
            if (nextChar === ',' || nextChar === ' ' || nextChar === '\n' || nextChar === '\r' || nextChar === '\t') {
              nextStateIndex++;
            } else {
              break;
            }
          }
          this.buffer = this.buffer.slice(nextStateIndex);
          i = -1;
        } else {
          this.currentValue += char;
          this.onFileProgress(this.currentKey, this.currentValue, false);
        }
      }
      i++;
    }

    if (this.state === 'inside_file_updates' || this.state === 'reading_key' || this.state === 'waiting_colon') {
      this.buffer = '';
    } else if (this.state === 'reading_value') {
      this.buffer = '';
    }
  }

  flush() {
    if (this.state === 'reading_value' && this.currentKey) {
      this.onFileProgress(this.currentKey, this.currentValue, true);
      this.parsedFiles.add(this.currentKey);
    }
  }
}