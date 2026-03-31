export enum EntryStatus {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
  ARCHIVED = "ARCHIVED",
}

export enum FieldType {
  TEXT = "TEXT",
  RICH_TEXT = "RICH_TEXT",
  NUMBER = "NUMBER",
  BOOLEAN = "BOOLEAN",
  DATE = "DATE",
  MEDIA = "MEDIA",
  RELATION = "RELATION",
  SELECT = "SELECT",
}

export interface CollectionField {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  unique?: boolean;
  defaultValue?: unknown;
  options?: string[]
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
  projectId: string
  collectionId: string;
  data: Record<string, unknown>;
  publishedAt?: Date;
  status: EntryStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEntryDto {
  data: Record<string, unknown>;
  status?: EntryStatus;
}

export interface UpdateEntryDto {
  data: Record<string, unknown>;
  status?: EntryStatus;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  status?: EntryStatus;
}
