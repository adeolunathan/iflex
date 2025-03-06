// services/integration-service/src/types/index.ts

export enum IntegrationType {
    CSV = 'CSV',
    EXCEL = 'EXCEL',
    API = 'API',
    DATABASE = 'DATABASE',
    ACCOUNTING_SOFTWARE = 'ACCOUNTING_SOFTWARE',
    CRM = 'CRM',
    HRIS = 'HRIS',
    CUSTOM = 'CUSTOM',
  }
  
  export enum DataDirection {
    IMPORT = 'IMPORT',
    EXPORT = 'EXPORT',
    BIDIRECTIONAL = 'BIDIRECTIONAL',
  }
  
  export enum AuthType {
    NONE = 'NONE',
    API_KEY = 'API_KEY',
    OAUTH2 = 'OAUTH2',
    BASIC = 'BASIC',
    TOKEN = 'TOKEN',
    CUSTOM = 'CUSTOM',
  }
  
  export enum ConnectionStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    ERROR = 'ERROR',
    PENDING = 'PENDING',
  }
  
  export enum ScheduleFrequency {
    MANUAL = 'MANUAL',
    HOURLY = 'HOURLY',
    DAILY = 'DAILY',
    WEEKLY = 'WEEKLY',
    MONTHLY = 'MONTHLY',
    CUSTOM = 'CUSTOM',
  }
  
  export interface DataMapping {
    id: string;
    sourceField: string;
    targetField: string;
    transform?: string;
    dataType: string;
  }
  
  export interface DataSource {
    id: string;
    name: string;
    organizationId: string;
    type: IntegrationType;
    description?: string;
    config: Record<string, any>;
    authConfig?: Record<string, any>;
    authType: AuthType;
    status: ConnectionStatus;
    dataDirection: DataDirection;
    mappings: DataMapping[];
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    updatedBy: string;
  }
  
  export interface IntegrationJob {
    id: string;
    dataSourceId: string;
    modelId?: string;
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
    startTime?: Date;
    endTime?: Date;
    recordsProcessed?: number;
    errorMessage?: string;
    createdAt: Date;
    createdBy: string;
  }
  
  export interface SyncSchedule {
    id: string;
    dataSourceId: string;
    frequency: ScheduleFrequency;
    customCron?: string;
    nextRunTime: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    updatedBy: string;
  }