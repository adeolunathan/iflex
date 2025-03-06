// services/calculation-engine/src/types/index.ts

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
  
  export interface ModelComponent {
    id: string;
    name: string;
    description?: string;
    type: ComponentType;
    dataType: DataType;
    formula?: string;
    references?: string[];
  }
  
  export interface Period {
    id: string;
    label: string;
    startDate: Date;
    endDate: Date;
  }
  
  export interface CalculationContext {
    modelId: string;
    scenarioId: string;
    versionId: string;
    periods: Period[];
    components: Record<string, ModelComponent>;
  }
  
  export interface CalculationNode {
    id: string;
    dependencies: string[];
    formula?: string;
    calculated: boolean;
    values: Record<string, any>;
  }
  
  export interface CalculationResult {
    componentId: string;
    periodId: string;
    value: any;
    error?: string;
  }