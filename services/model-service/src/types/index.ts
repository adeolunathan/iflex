// services/model-service/src/types/index.ts

export enum ComponentType {
    INPUT = 'INPUT',
    FORMULA = 'FORMULA',
    REFERENCE = 'REFERENCE',
    AGGREGATION = 'AGGREGATION',
  }
  
  export enum DataType {
    NUMBER = 'NUMBER',
    PERCENTAGE = 'PERCENTAGE',
    CURRENCY = 'CURRENCY',
    DATE = 'DATE',
    TEXT = 'TEXT',
    BOOLEAN = 'BOOLEAN',
  }
  
  export enum TimePeriod {
    DAYS = 'DAYS',
    WEEKS = 'WEEKS',
    MONTHS = 'MONTHS',
    QUARTERS = 'QUARTERS',
    YEARS = 'YEARS',
  }
  
  export interface ModelComponent {
    id: string;
    name: string;
    description?: string;
    type: ComponentType;
    dataType: DataType;
    formula?: string;
    references?: string[];
    position: {
      x: number;
      y: number;
    };
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    updatedBy: string;
  }
  
  export interface TimeSeriesData {
    componentId: string;
    period: string;
    value: number | string | boolean;
    scenarioId?: string;
    versionId?: string;
  }
  
  export interface FinancialModel {
    id: string;
    name: string;
    description?: string;
    components: ModelComponent[];
    startDate: Date;
    endDate: Date;
    timePeriod: TimePeriod;
    periodCount: number;
    organizationId: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    updatedBy: string;
  }