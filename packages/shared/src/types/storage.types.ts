export enum AssetType {
  IMAGE    = 'IMAGE',
  VIDEO    = 'VIDEO',
  FONT     = 'FONT',
  DOCUMENT = 'DOCUMENT',
  OTHER    = 'OTHER',
}

export enum OptimizationStatus {
  PENDING    = 'PENDING',
  PROCESSING = 'PROCESSING',
  DONE       = 'DONE',
  FAILED     = 'FAILED',
}

export interface Asset {
  id:                 string;
  projectId:          string;
  name:               string;
  url:                string;
  secureUrl:          string;
  publicId:           string;
  assetType:          AssetType;
  mimeType:           string;
  size:               number;
  optimizedSize?:     number;
  width?:             number;
  height?:            number;
  duration?:          number;
  optimizationStatus: OptimizationStatus;
  optimizedUrl?:      string;
  tags:               string[];
  uploadedBy:         string;
  createdAt:          Date;
  updatedAt:          Date;
}

export interface OptimizeAssetDto {
  quality?:   number;
  maxWidth?:  number;
  maxHeight?: number;
  format?:    'webp' | 'avif' | 'jpeg' | 'png';
}

export interface OptimizeAssetResponse {
  asset:        Asset;
  savedBytes:   number;
  savedPercent: number;
}

export interface AssetUsage {
  totalAssets:    number;
  totalSize:      number;
  byType:         { type: AssetType; count: number; size: number }[];
  optimizedCount: number;
  savedBytes:     number;
}

export interface AssetQuery {
  page?:      number;
  limit?:     number;
  search?:    string;
  assetType?: AssetType;
  tags?:      string;
  sortBy?:    string;
  sortOrder?: 'asc' | 'desc';
}


export enum MediaType {
  IMAGE    = 'IMAGE',
  VIDEO    = 'VIDEO',
  DOCUMENT = 'DOCUMENT',
}

export interface MediaAsset {
  id:         string;
  projectId:  string;
  name:       string;
  url:        string;
  secureUrl:  string;
  publicId:   string;
  mediaType:  MediaType;
  mimeType:   string;
  size:       number;
  width?:     number;
  height?:    number;
  duration?:  number;
  folder:     string;
  uploadedBy: string;
  createdAt:  Date;
}

export interface MediaQuery {
  page?:      number;
  limit?:     number;
  search?:    string;
  mediaType?: MediaType;
}

export interface Paginated<T> {
  data:       T[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}