
export enum TemplateCategory {
  LANDING_PAGE  = 'LANDING_PAGE',
  PORTFOLIO     = 'PORTFOLIO',
  BLOG          = 'BLOG',
  ECOMMERCE     = 'ECOMMERCE',
  DASHBOARD     = 'DASHBOARD',
  SAAS          = 'SAAS',
  AGENCY        = 'AGENCY',
  PERSONAL      = 'PERSONAL',
  OTHER         = 'OTHER',
}

export enum TemplateFramework {
  REACT  = 'REACT',
  VUE    = 'VUE',
  SVELTE = 'SVELTE',
  NEXT   = 'NEXT',
}

export interface TemplateFile {
  path:    string;  
  content: string;  
}

export interface Template {
  id:           string;
  name:         string;
  description:  string;
  category:     TemplateCategory;
  framework:    TemplateFramework;
  previewUrl:   string;         
  demoUrl?:     string;          
  tags:         string[];
  isPremium:    boolean;
  usageCount:   number;
  createdAt:    Date;
  updatedAt:    Date;
}

export interface TemplateDetail extends Template {
  files:        TemplateFile[];
  dependencies: Record<string, string>;  
}

export interface TemplateCategory_Response {
  category:  TemplateCategory;
  label:     string;
  count:     number;
}


export interface TemplateQuery {
  page?:      number;
  limit?:     number;
  search?:    string;
  category?:  TemplateCategory;
  framework?: TemplateFramework;
  isPremium?: boolean;
}

export interface UseTemplateResponse {
  projectId:  string;
  templateId: string;
  message:    string;
}

export interface PaginatedTemplate<T> {
  data:       T[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}