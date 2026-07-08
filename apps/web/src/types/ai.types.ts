export type JobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface CanvasElement {
  id: string;
  type: string;
  props?: Record<string, unknown>;
  styles?: Record<string, string | number>;
  children?: CanvasElement[];
}

export interface CanvasSnapshot {
  elements: CanvasElement[];
  styles?: {
    fontFamily?: string;
    primaryColor?: string;
    [key: string]: string | number | undefined;
  };
  error?: string;
  rawResponse?: string;
}

export interface AIGenerateContext {
  type?: string;
  style?: string;
  [key: string]: unknown;
}

export interface AIGenerateRequest {
  projectId?: string;
  prompt: string;
  context?: AIGenerateContext;
}

export interface AIGenerateResponse {
  jobId: string;
  status: JobStatus;
  message: string;
}

export interface AIJobResponse {
  id: string;
  status: JobStatus;
  jobType: string;
  prompt: string;
  result: CanvasSnapshot | null;
  error: string | null;
  project?: {
    id: string;
    name: string;
    slug?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AISuggestionsRequest {
  projectId: string;
  suggestionType?: string;
  context?: Record<string, unknown>;
}
