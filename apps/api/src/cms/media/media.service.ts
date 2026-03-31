import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CloudinaryService } from '../../storage/cloudinary.service';
import { MediaAsset, MediaType, Paginated, MediaQuery } from '@repo/shared';

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async findAll(
    projectId: string,
    query: MediaQuery,
  ): Promise<Paginated<MediaAsset>> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, query.limit ?? 20);
    const skip = (page - 1) * limit;

    const where = {
      projectId,
      ...(query.mediaType && { mediaType: query.mediaType }),
      ...(query.search && {
        name: { contains: query.search, mode: 'insensitive' as const },
      }),
    };

    const [assets, total] = await Promise.all([
      this.prisma.cmsMedia.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.cmsMedia.count({ where }),
    ]);

    return {
      data: assets.map(this.toMediaAsset),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async upload(
    projectId: string,
    userId: string,
    file: Express.Multer.File,
  ): Promise<MediaAsset> {
    const folder = `projects/${projectId}/cms-media`;

    const result = await this.cloudinary.upload(file, { folder });

    const mediaType = this.resolveMediaType(file.mimetype);

    const asset = await this.prisma.cmsMedia.create({
      data: {
        projectId,
        name: file.originalname,
        url: result.url,
        secureUrl: result.secureUrl,
        publicId: result.publicId,
        mimeType: file.mimetype,
        size: result.size,
        width: result.width,
        height: result.height,
        duration: result.duration,
        folder,
        uploadedBy: userId,
        type: mediaType,
      },
    });

    return this.toMediaAsset(asset);
  }

  async remove(projectId: string, id: string): Promise<void> {
    const asset = await this.prisma.cmsMedia.findFirst({
      where: { id, projectId },
    });

    if (!asset) throw new NotFoundException('Media asset not found');

    await this.cloudinary.delete(asset.publicId, asset.mimeType);
    await this.prisma.cmsMedia.delete({ where: { id } });
  }

  // ── //////////////////////////// Helpers //////////////////////////////

  private resolveMediaType(mimeType: string): MediaType {
    if (mimeType.startsWith('image/')) return MediaType.IMAGE;
    if (mimeType.startsWith('video/')) return MediaType.VIDEO;
    return MediaType.DOCUMENT;
  }

  private toMediaAsset(raw: any): MediaAsset {
    return {
      id: raw.id,
      projectId: raw.projectId,
      name: raw.name,
      url: raw.url,
      secureUrl: raw.secureUrl,
      publicId: raw.publicId,
      mediaType: raw.mediaType as MediaType,
      mimeType: raw.mimeType,
      size: raw.size,
      width: raw.width ?? undefined,
      height: raw.height ?? undefined,
      duration: raw.duration ?? undefined,
      folder: raw.folder,
      uploadedBy: raw.uploadedBy,
      createdAt: raw.createdAt,
    };
  }
}
