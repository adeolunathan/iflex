// services/analytics-service/src/utils/data-aggregation.ts

import { TimeSeriesData } from './model-service';

export enum AggregationType {
  SUM = 'SUM',
  AVERAGE = 'AVERAGE',
  MIN = 'MIN',
  MAX = 'MAX',
  FIRST = 'FIRST',
  LAST = 'LAST',
  COUNT = 'COUNT',
}

export enum TimeGranularity {
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  QUARTER = 'QUARTER',
  YEAR = 'YEAR',
}

export interface AggregationOptions {
  type: AggregationType;
  timeGranularity?: TimeGranularity;
  periods?: string[];
  scenarios?: string[];
  versions?: string[];
}

export function aggregateTimeSeriesData(
  data: TimeSeriesData[],
  componentId: string,
  options: AggregationOptions
): number | null {
  // Filter data for the specified component
  const componentData = data.filter(item => item.componentId === componentId);
  
  if (componentData.length === 0) {
    return null;
  }
  
  // Apply additional filters if specified
  let filteredData = componentData;
  
  if (options.periods && options.periods.length > 0) {
    filteredData = filteredData.filter(item => options.periods!.includes(item.period));
  }
  
  if (options.scenarios && options.scenarios.length > 0) {
    filteredData = filteredData.filter(item => 
      item.scenarioId ? options.scenarios!.includes(item.scenarioId) : false
    );
  }
  
  if (options.versions && options.versions.length > 0) {
    filteredData = filteredData.filter(item => 
      item.versionId ? options.versions!.includes(item.versionId) : false
    );
  }
  
  if (filteredData.length === 0) {
    return null;
  }
  
  // Convert values to numbers
  const numericValues = filteredData.map(item => Number(item.value)).filter(val => !isNaN(val));
  
  if (numericValues.length === 0) {
    return null;
  }
  
  // Apply aggregation
  switch (options.type) {
    case AggregationType.SUM:
      return numericValues.reduce((sum, val) => sum + val, 0);
      
    case AggregationType.AVERAGE:
      return numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length;
      
    case AggregationType.MIN:
      return Math.min(...numericValues);
      
    case AggregationType.MAX:
      return Math.max(...numericValues);
      
    case AggregationType.FIRST:
      return numericValues[0];
      
    case AggregationType.LAST:
      return numericValues[numericValues.length - 1];
      
    case AggregationType.COUNT:
      return numericValues.length;
      
    default:
      return null;
  }
}

export function transformTimeSeriesData(
  data: TimeSeriesData[],
  componentIds: string[]
): Record<string, any>[] {
  // Group data by period
  const periodMap: Record<string, Record<string, any>> = {};
  
  data.forEach(item => {
    const { componentId, period, value } = item;
    
    // Initialize period if needed
    if (!periodMap[period]) {
      periodMap[period] = { period };
    }
    
    // Add value to period data
    periodMap[period][componentId] = Number(value);
  });
  
  // Convert to array and sort by period
  return Object.values(periodMap).sort((a, b) => {
    return new Date(a.period).getTime() - new Date(b.period).getTime();
  });
}