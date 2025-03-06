// services/analytics-service/src/types/index.ts

export enum ReportType {
    STANDARD = 'STANDARD',
    CUSTOM = 'CUSTOM',
    DASHBOARD = 'DASHBOARD',
  }
  
  export enum WidgetType {
    TIME_SERIES = 'TIME_SERIES',
    METRICS = 'METRICS',
    TABLE = 'TABLE',
    PIE_CHART = 'PIE_CHART',
    BAR_CHART = 'BAR_CHART',
    HEAT_MAP = 'HEAT_MAP',
    TEXT = 'TEXT',
    KPI = 'KPI',
  }
  
  export enum ScheduleFrequency {
    MANUAL = 'MANUAL',
    DAILY = 'DAILY',
    WEEKLY = 'WEEKLY',
    MONTHLY = 'MONTHLY',
    QUARTERLY = 'QUARTERLY',
  }
  
  export interface Position {
    x: number;
    y: number;
    width: number;
    height: number;
  }
  
  export interface Widget {
    id: string;
    reportId: string;
    name: string;
    description?: string;
    type: WidgetType;
    config: Record<string, any>;
    position: Position;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    updatedBy: string;
  }
  
  export interface Report {
    id: string;
    name: string;
    description?: string;
    type: ReportType;
    modelId?: string;
    organizationId: string;
    isPublic: boolean;
    config: Record<string, any>;
    tags: string[];
    widgets: Widget[];
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    updatedBy: string;
  }
  
  export interface ReportSchedule {
    id: string;
    reportId: string;
    frequency: ScheduleFrequency;
    recipients: string[];
    nextRunTime: Date;
    isActive: boolean;
    lastRunTime?: Date;
    lastRunStatus?: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    updatedBy: string;
  }
  
  export interface QueryCache {
    id: string;
    query: string;
    params: Record<string, any>;
    result: any;
    expiresAt: Date;
    createdAt: Date;
  }
  
  export interface AnalyticsMetric {
    id: string;
    name: string;
    description?: string;
    formula: string;
    modelId?: string;
    organizationId: string;
    isPublic: boolean;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    updatedBy: string;
  }
  