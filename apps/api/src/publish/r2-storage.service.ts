
import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  PutObjectCommandInput,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import * as path from 'path';
import { BundledFile, getConfig, R2UploadOptions } from '@repo/shared';

export interface R2File {
  content: Buffer;
  contentType: string;
  size: number;
}

const UPLOAD_CONCURRENCY = 20;

@Injectable()
export class R2StorageService {
  private readonly logger = new Logger(R2StorageService.name);
  private readonly config = getConfig();
  private readonly client: S3Client;

  constructor() {
    const r2 = this.config.publishing?.r2;

    if (!r2?.accountId || !r2?.accessKeyId || !r2?.secretAccessKey) {
      throw new Error(
        'R2 credentials are not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in your .env file.',
      );
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${r2.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: r2.accessKeyId,
        secretAccessKey: r2.secretAccessKey,
      },
    });
  }

  /**
   * Upload all bundled files to R2 under sites/{projectSlug}/
   *
   * File layout in R2:
   *   sites/{slug}/index.html
   *   sites/{slug}/assets/main-abc123.js
   *   sites/{slug}/assets/main-abc123.css
   *
   * Returns the public CDN URL for the project root.
   */
  async uploadSite(options: R2UploadOptions): Promise<string> {
    const { projectSlug, files } = options;
    const prefix = `sites/${projectSlug}`;

    this.logger.log(`Uploading ${files.length} files to R2 at ${prefix}/`);

    // Upload in controlled batches to avoid overwhelming R2
    const chunks = this.chunk(files, UPLOAD_CONCURRENCY);
    let uploadedCount = 0;

    for (const batch of chunks) {
      await Promise.all(
        batch.map(async (file) => {
          const key = `${prefix}/${file.path}`;
          await this.uploadFile(key, file);
          uploadedCount++;
        }),
      );
      this.logger.debug(`Uploaded ${uploadedCount}/${files.length} files`);
    }

    const siteUrl = `${this.config.publishing?.r2.publicUrl}/${prefix}`;
    this.logger.log(`Upload complete. Site URL: ${siteUrl}`);
    return siteUrl;
  }

  /**
   * Delete all files for a project (used when unpublishing or overwriting).
   * Lists and deletes in batches of 1000 (R2/S3 limit).
   */
  async deleteSite(projectSlug: string): Promise<void> {
    const prefix = `sites/${projectSlug}/`;
    this.logger.log(`Deleting site files at ${prefix}`);

    let continuationToken: string | undefined;
    let totalDeleted = 0;

    do {
      const listResult = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.config.publishing?.r2.bucketName,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );

      const objects = listResult.Contents ?? [];
      if (objects.length > 0) {
        await this.client.send(
          new DeleteObjectsCommand({
            Bucket: this.config.publishing?.r2.bucketName,
            Delete: {
              Objects: objects.map((o) => ({ Key: o.Key! })),
              Quiet: true,
            },
          }),
        );
        totalDeleted += objects.length;
      }

      continuationToken = listResult.NextContinuationToken;
    } while (continuationToken);

    this.logger.log(`Deleted ${totalDeleted} objects from ${prefix}`);
  }

  /**
   * Check if a published site exists in R2.
   */
  async siteExists(projectSlug: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.config.publishing?.r2.bucketName,
          Key: `sites/${projectSlug}/index.html`,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
 * Get a single file from R2 by key.
 * Used in dev mode to serve published sites locally.
 * Returns null if the file doesn't exist.
 */
async getFile(key: string): Promise<R2File | null> {
  try {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.config.publishing?.r2.bucketName,
        Key: key,
      }),
    );

    // Convert readable stream to Buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    const content = Buffer.concat(chunks);

    return {
      content,
      contentType: response.ContentType ?? 'application/octet-stream',
      size: content.length,
    };
  } catch (error) {
    // NoSuchKey means file doesn't exist — return null instead of throwing
    if (error?.name === 'NoSuchKey') {
      return null;
    }
    throw error;
  }
}
  // ── Private ─────────────────────────────────────────────────────────────────

  private async uploadFile(key: string, file: BundledFile): Promise<void> {
    const params: PutObjectCommandInput = {
      Bucket: this.config.publishing?.r2.bucketName,
      Key: key,
      Body: file.content,
      ContentType: file.contentType,
      CacheControl: this.getCacheControl(file.path, file.contentType),
      ContentLength: file.size,
      Metadata: {
        'uploaded-at': new Date().toISOString(),
      },
    };

    await this.client.send(new PutObjectCommand(params));
  }

  /**
   * Cache strategy:
   *   - index.html           → no-cache (always check for updates)
   *   - hashed assets        → immutable 1 year (content-addressed)
   *   - unhashed js/css      → 1 hour
   *   - images/fonts         → 1 day
   */
  private getCacheControl(filePath: string, contentType: string): string {
    const fileName = path.basename(filePath);

    if (contentType === 'text/html' || fileName === 'index.html') {
      return 'public, max-age=0, must-revalidate';
    }

    // Hashed assets: e.g. main-abc12345.js, chunk-xyz789.css
    if (/[\.\-][a-f0-9]{6,}[\.\-](js|css|woff2?|ttf)$/i.test(fileName)) {
      return 'public, max-age=31536000, immutable';
    }

    if (contentType.startsWith('image/') || contentType.startsWith('font/')) {
      return 'public, max-age=86400';
    }

    if (
      contentType === 'application/javascript' ||
      contentType === 'text/javascript' ||
      contentType === 'text/css'
    ) {
      return 'public, max-age=3600';
    }

    return 'public, max-age=3600';
  }

  private chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }
}
