// services/export-service/src/types/index.ts

export enum ExportFormat {
    PDF = 'PDF',
    EXCEL = 'EXCEL',
    CSV = 'CSV',
    JSON = 'JSON',
    HTML = 'HTML',
  }
  
  export enum ExportType {
    MODEL = 'MODEL',
    REPORT = 'REPORT',
    DATA = 'DATA',
  }
  
  export enum ExportStatus {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
  }
  
  export interface ExportJob {
    id: string;
    userId: string;
    organizationId: string;
    type: ExportType;
    format: ExportFormat;
    sourceId: string;
    config: Record<string, any>;
    status: ExportStatus;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    errorMessage?: string;
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
  }
  
  export interface ExportTemplate {
    id: string;
    name: string;
    description?: string;
    type: ExportType;
    format: ExportFormat;
    config: Record<string, any>;
    organizationId: string;
    isPublic: boolean;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    updatedBy: string;
  }
  