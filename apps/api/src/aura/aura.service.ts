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
}
