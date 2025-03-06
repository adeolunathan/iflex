// frontend/src/types/model.ts

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
  
  export interface Position {
    x: number;
    y: number;
  }
  
  export interface ModelComponent {
    id: string;
    name: string;
    description?: string;
    type: ComponentType;
    dataType: DataType;
    formula?: string;
    references?: string[];
    position: Position;
  }
  
  export interface TimeSeriesData {
    componentId: string;
    period: string;
    value: string;
    scenarioId?: string;
    versionId?: string;
  }
  
  export interface FinancialModel {
    id: string;
    name: string;
    description?: string;
    components: ModelComponent[];
    startDate: string;
    endDate: string;
    timePeriod: TimePeriod;
    periodCount: number;
    organizationId: string;
  }