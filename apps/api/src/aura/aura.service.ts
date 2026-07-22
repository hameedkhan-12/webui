import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuraService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persist generated component metadata into the workspace entries under `.aura/generated/`.
   */
  async registerGenerated(projectId: string, path: string, meta: any) {
    const filePath = `.aura/generated/${meta?.name ?? encodeURIComponent(path)}.json`;

    await this.prisma.workspaceEntry.upsert({
      where: { projectId_path: { projectId, path: filePath } },
      create: { projectId, path: filePath, content: JSON.stringify(meta || {}), kind: 'file' },
      update: { content: JSON.stringify(meta || {}), kind: 'file' },
    });
  }

  async saveContentTree(projectId: string, nodes: any[]) {
    const filePath = '.aura/content-tree.json';
    await this.prisma.workspaceEntry.upsert({
      where: { projectId_path: { projectId, path: filePath } },
      create: {
        projectId,
        path: filePath,
        content: JSON.stringify(nodes),
        kind: 'file',
      },
      update: {
        content: JSON.stringify(nodes),
      },
    });

    try {
      await this.prisma.project.update({
        where: { id: projectId },
        data: { updatedAt: new Date() },
      });
    } catch (e) {
      // Ignore if project record doesn't exist
    }
  }

  async loadContentTree(projectId: string): Promise<any[] | null> {
    const filePath = '.aura/content-tree.json';
    const entry = await this.prisma.workspaceEntry.findUnique({
      where: { projectId_path: { projectId, path: filePath } },
    });
    if (!entry) return null;
    try {
      return JSON.parse(entry.content);
    } catch {
      return null;
    }
  }
}
