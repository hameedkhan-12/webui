
export enum FieldType {
  TEXT       = 'TEXT',
  RICH_TEXT  = 'RICH_TEXT',
  NUMBER     = 'NUMBER',
  BOOLEAN    = 'BOOLEAN',
  DATE       = 'DATE',
  MEDIA      = 'MEDIA',
  SELECT     = 'SELECT',
  RELATION   = 'RELATION',
}

export enum MediaType {
  IMAGE    = 'IMAGE',
  VIDEO    = 'VIDEO',
  DOCUMENT = 'DOCUMENT',
  // OTHER    = 'OTHER',
}

export enum EntryStatus {
  DRAFT     = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED  = 'ARCHIVED',
}

export interface CollectionField {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  unique?: boolean;
  options?: string[];     
  defaultValue?: unknown;
}

export interface Collection {
  id: string;
  projectId: string;
  name: string;
  slug: string;           
  description?: string;
  fields: CollectionField[];
  entryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCollectionDto {
  name: string;
  slug: string;
  description?: string;
  fields: CollectionField[];
}

export interface UpdateCollectionDto {
  name?: string;
  description?: string;
  fields?: CollectionField[];
}

export interface Entry {
  id: string;
  collectionId: string;
  projectId: string;
  data: Record<string, unknown>;  // dynamic — shaped by collection fields
  status: EntryStatus;
  publishedAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEntryDto {
  data: Record<string, unknown>;
  status?: EntryStatus;
}

export interface UpdateEntryDto {
  data?: Record<string, unknown>;
  status?: EntryStatus;
}

export interface MediaAsset {
  id: string;
  projectId: string;
  name: string;
  url: string;             // Cloudinary CDN URL
  secureUrl: string;       // HTTPS URL (always use this)
  publicId: string;        // Cloudinary public_id (needed for deletion)
  type: MediaType;
  mimeType: string;
  size: number;            // bytes
  width?: number;          // images/videos
  height?: number;         // images/videos
  duration?: number;       // videos (seconds)
  folder: string;
  uploadedBy: string;
  createdAt: Date;
}

// Shared API response shapes (frontend uses these too)

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: EntryStatus;
}