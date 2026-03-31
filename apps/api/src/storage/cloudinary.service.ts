
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse, TransformationOptions } from 'cloudinary';

export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/avif',
  // Video
  'video/mp4',
  'video/webm',
  'video/quicktime',
  // Fonts
  'font/ttf',
  'font/otf',
  'font/woff',
  'font/woff2',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export type CloudinaryResourceType = 'image' | 'video' | 'raw';

export interface UploadOptions {
  folder:  string;   // e.g. "projects/abc123/assets"
  tags?:   string[];
}

export interface CloudinaryUploadResult {
  publicId:  string;
  url:       string;
  secureUrl: string;
  size:      number;
  width?:    number;
  height?:   number;
  duration?: number;
  format:    string;
}

export interface CloudinaryOptimizeResult {
  optimizedUrl:  string;
  optimizedSize: number;
}

export interface OptimizeOptions {
  quality?:   number | 'auto';
  maxWidth?:  number;
  maxHeight?: number;
  format?:    'webp' | 'avif' | 'jpeg' | 'png' | 'auto';
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
      api_key:    process.env.CLOUDINARY_API_KEY!,
      api_secret: process.env.CLOUDINARY_API_SECRET!,
      secure:     true,
    });

    this.logger.log('Cloudinary configured');
  }

  async upload(
    file:    Express.Multer.File,
    options: UploadOptions,
  ): Promise<CloudinaryUploadResult> {
    this.validateFile(file);

    const resourceType = this.resolveResourceType(file.mimetype);

    this.logger.log(
      `Uploading "${file.originalname}" (${file.mimetype}) to ${options.folder}`,
    );

    const result = await this.uploadBuffer(file.buffer, {
      folder:          options.folder,
      resource_type:   resourceType,
      tags:            options.tags ?? [],
      use_filename:    false,
      unique_filename: true,
      overwrite:       false,
    });

    this.logger.log(`Upload complete: ${result.public_id}`);

    return {
      publicId:  result.public_id,
      url:       result.url,
      secureUrl: result.secure_url,
      size:      result.bytes,
      width:     result.width,
      height:    result.height,
      duration:  result.duration,
      format:    result.format,
    };
  }

  async optimize(
    publicId: string,
    options:  OptimizeOptions,
  ): Promise<CloudinaryOptimizeResult> {
    const transformation: TransformationOptions = {
      quality:      options.quality  ?? 'auto',
      fetch_format: options.format   ?? 'auto',
      ...(options.maxWidth  && { width:  options.maxWidth,  crop: 'limit' }),
      ...(options.maxHeight && { height: options.maxHeight, crop: 'limit' }),
    };

    const optimizedUrl = cloudinary.url(publicId, {
      transformation: [transformation],
      secure: true,
    });

    const optimizedSize = await this.fetchContentLength(optimizedUrl);

    return { optimizedUrl, optimizedSize };
  }


  async delete(publicId: string, mimeType: string): Promise<void> {
    const resourceType = this.resolveResourceType(mimeType);

    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    this.logger.log(`Deleted from Cloudinary: ${publicId}`);
  }


  validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException(
        'No file provided. Send multipart/form-data with a "file" field.',
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds the 100MB limit`,
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type "${file.mimetype}" is not supported`,
      );
    }
  }

  resolveResourceType(mimeType: string): CloudinaryResourceType {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    return 'raw';
  }

  private uploadBuffer(
    buffer:  Buffer,
    options: object,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        options,
        (error, result) => {
          if (error || !result) {
            return reject(error ?? new Error('No result from Cloudinary'));
          }
          resolve(result);
        },
      );
      stream.end(buffer);
    });
  }

  private async fetchContentLength(url: string): Promise<number> {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      const len = res.headers.get('content-length');
      return len ? parseInt(len, 10) : 0;
    } catch {
      return 0;
    }
  }
}