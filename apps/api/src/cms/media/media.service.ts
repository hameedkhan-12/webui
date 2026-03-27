import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CloudinaryService } from './cloudinary.service';
import { MediaAsset, MediaType } from '@repo/shared';
import * as path from 'path';

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Videos
  'video/mp4',
  'video/webm',
  'video/ogg',
  // Documents
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async findAll(projectId: string, type?: MediaType): Promise<MediaAsset[]> {
    const media = await this.prisma.cmsMedia.findMany({
      where: {
        projectId,
        ...(type ? { type } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return media.map(this.toMediaAsset);
  }

  async uploadMedia(
    projectId: string,
    file: Express.Multer.File,
  ): Promise<MediaAsset> {
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024} MB`,
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(`File type not allowed: ${file.mimetype}`);
    }

    const originalName = file.originalname;
    const nameWithoutExt = path
      .basename(originalName, path.extname(originalName))
      .replace(/[^a-zA-Z0-9]/g, '-')
      .toLowerCase();

    const folder = `projects/${projectId}/media`;
    const resourceType = this.cloudinary.getResourceType(file.mimetype);
    const mediaType = this.cloudinary.getMediaType(file.mimetype);

    this.logger.log(
      `Uploading ${file.originalname} (${file.size}) to ${folder}`,
    );
    const result = await this.cloudinary.upload(file.buffer, {
      folder,
      filename: nameWithoutExt,
      resourceType,
    });

    const media = await this.prisma.cmsMedia.create({
      data: {
        projectId,
        name: nameWithoutExt,
        uploadedBy: originalName,
        url: result.url,
        secureUrl: result.secureUrl,
        publicId: result.publicId,
        type: mediaType,
        mimeType: file.mimetype,
        size: file.size,
        width: result.width ?? null,
        height: result.height ?? null,
        folder,
      },
    });
    this.logger.log(`Uploaded: ${result.publicId}`);
    return this.toMediaAsset(media);
  }

  async removeMedia(projectId: string, mediaId: string): Promise<void> {
    const media = await this.prisma.cmsMedia.findFirst({
      where: {
        id: mediaId,
        projectId,
      },
    });

    if (!media) {
      throw new BadRequestException('Media not found');
    }

    const resourceType = this.cloudinary.getResourceType(media.mimeType);

    await this.cloudinary.delete(media.publicId, resourceType);
    await this.prisma.cmsMedia.delete({
      where: {
        id: mediaId,
      },
    });

    this.logger.log(`Deleted: ${media.publicId}`);
  }
  private toMediaAsset(raw: any): MediaAsset {
    return {
      id: raw.id,
      projectId: raw.projectId,
      name: raw.name,
      url: raw.url,
      secureUrl: raw.secureUrl,
      publicId: raw.publicId,
      type: raw.type as MediaType,
      mimeType: raw.mimeType,
      size: raw.size,
      width: raw.width ?? undefined,
      height: raw.height ?? undefined,
      folder: raw.folder,
      uploadedBy: raw.uploadedBy,
      createdAt: raw.createdAt,
    };
  }
}
