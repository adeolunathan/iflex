// services/analytics-service/src/utils/report-generator.ts

import { pgPool, clickhouseClient } from '../db';
import { Report, Widget, WidgetType } from '../types';
import { getModel, getTimeSeriesData } from './model-service';
import { transformTimeSeriesData, aggregateTimeSeriesData, AggregationType } from './data-aggregation';

export async function getReportData(reportId: string, userId: string): Promise<Report | null> {
  try {
    // Get report
    const { rows } = await pgPool.query(
      'SELECT * FROM reports WHERE id = $1',
      [reportId]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    const report = rows[0] as Report;
    
    // Get widgets
    const { rows: widgetRows } = await pgPool.query(
      'SELECT * FROM widgets WHERE report_id = $1 ORDER BY created_at',
      [reportId]
    );
    
    report.widgets = widgetRows as Widget[];
    
    // For each widget, get the data
    for (const widget of report.widgets) {
      widget.data = await getWidgetData(widget, report, userId);
    }
    
    return report;
  } catch (error) {
    console.error('Error getting report data:', error);
    return null;
  }
}

async function getWidgetData(widget: Widget, report: Report, userId: string): Promise<any> {
  // Process based on widget type
  switch (widget.type) {
    case WidgetType.TIME_SERIES:
      return getTimeSeriesWidgetData(widget, report, userId);
      
    case WidgetType.METRICS:
      return getMetricsWidgetData(widget, report, userId);
      
    case WidgetType.TABLE:
      return getTableWidgetData(widget, report, userId);
      
    case WidgetType.PIE_CHART:
    case WidgetType.BAR_CHART:
      return getChartWidgetData(widget, report, userId);
      
    case WidgetType.HEAT_MAP:
      return getHeatMapWidgetData(widget, report, userId);
      
    case WidgetType.TEXT:
      // Text widgets don't need any data processing
      return null;
      
    case WidgetType.KPI:
      return getKPIWidgetData(widget, report, userId);
      
    default:
      return null;
  }
}

async function getTimeSeriesWidgetData(widget: Widget, report: Report, userId: string): Promise<any> {
  if (!report.modelId) {
    return null;
  }
  
  // Extract component IDs from widget config
  const { componentIds, scenarioId, versionId } = widget.config;
  
  if (!componentIds || componentIds.length === 0) {
    return null;
  }
  
  // Get time series data for the components
  const timeSeriesData = await getTimeSeriesData(
    componentIds,
    scenarioId,
    versionId,
    'system' // Using system token for now
  );
  
  // Transform the data for visualization
  return transformTimeSeriesData(timeSeriesData, componentIds);
}

async function getMetricsWidgetData(widget: Widget, report: Report, userId: string): Promise<any> {
  if (!report.modelId) {
    return null;
  }
  
  // Extract metrics configuration
  const { metrics } = widget.config;
  
  if (!metrics || metrics.length === 0) {
    return null;
  }
  
  // Get component IDs from all metrics
  const componentIds = metrics.map((metric: any) => metric.componentId);
  
  // Get time series data for all components
  const timeSeriesData = await getTimeSeriesData(
    componentIds,
    widget.config.scenarioId,
    widget.config.versionId,
    'system' // Using system token for now
  );
  
  // Calculate each metric
  const result = [];
  
  for (const metric of metrics) {
    const aggregationType = metric.aggregationType || AggregationType.LAST;
    
    const value = aggregateTimeSeriesData(
      timeSeriesData,
      metric.componentId,
      {
        type: aggregationType,
        periods: metric.periods,
        scenarios: metric.scenarios,
        versions: metric.versions,
      }
    );
    
    result.push({
      id: metric.id,
      name: metric.name,
      value: value !== null ? value : 0,
      format: metric.format || 'number',
    });
  }
  
  return result;
}

async function getTableWidgetData(widget: Widget, report: Report, userId: string): Promise<any> {
  if (!report.modelId) {
    return null;
  }
  
  // Extract component IDs and configuration
  const { componentIds, scenarioId, versionId, periods } = widget.config;
  
  if (!componentIds || componentIds.length === 0) {
    return null;
  }
  
  // Get time series data for the components
  const timeSeriesData = await getTimeSeriesData(
    componentIds,
    scenarioId,
    versionId,
    'system' // Using system token for now
  );
  
  // Filter by periods if specified
  const filteredData = periods && periods.length > 0
    ? timeSeriesData.filter(item => periods.includes(item.period))
    : timeSeriesData;
  
  // Transform the data for tabular display
  return transformTimeSeriesData(filteredData, componentIds);
}

async function getChartWidgetData(widget: Widget, report: Report, userId: string): Promise<any> {
  if (!report.modelId) {
    return null;
  }
  
  // Extract component IDs and configuration
  const { componentIds, scenarioId, versionId, aggregationType } = widget.config;
  
  if (!componentIds || componentIds.length === 0) {
    return null;
  }
  
  // Get time series data for the components
  const timeSeriesData = await getTimeSeriesData(
    componentIds,
    scenarioId,
    versionId,
    'system' // Using system token for now
  );
  
  // If aggregation is specified, aggregate the data
  if (aggregationType) {
    const result = [];
    
    for (const componentId of componentIds) {
      const value = aggregateTimeSeriesData(
        timeSeriesData,
        componentId,
        { type: aggregationType }
      );
      
      // Get component name from the model
      const model = await getModel(report.modelId, 'system');
      const component = model?.components.find(c => c.id === componentId);
      
      result.push({
        name: component?.name || componentId,
        value: value !== null ? value : 0,
      });
    }
    
    return result;
  }
  
  // Otherwise, return the time series data
  return transformTimeSeriesData(timeSeriesData, componentIds);
}

async function getHeatMapWidgetData(widget: Widget, report: Report, userId: string): Promise<any> {
  if (!report.modelId) {
    return null;
  }
  
  // Extract component IDs and configuration
  const { xAxisComponentId, yAxisComponentId, valueComponentId, scenarioId, versionId } = widget.config;
  
  if (!xAxisComponentId || !yAxisComponentId || !valueComponentId) {
    return null;
  }
  
  // Get time series data for all components
  const timeSeriesData = await getTimeSeriesData(
    [xAxisComponentId, yAxisComponentId, valueComponentId],
    scenarioId,
    versionId,
    'system' // Using system token for now
  );
  
  // Group by period for easier access
  const periodMap: Record<string, Record<string, string>> = {};
  
  timeSeriesData.forEach(item => {
    if (!periodMap[item.period]) {
      periodMap[item.period] = {};
    }
    
    periodMap[item.period][item.componentId] = item.value;
  });
  
  // Generate heat map data
  const result = [];
  
  for (const period in periodMap) {
    const xValue = periodMap[period][xAxisComponentId];
    const yValue = periodMap[period][yAxisComponentId];
    const value = periodMap[period][valueComponentId];
    
    if (xValue && yValue && value) {
      result.push({
        x: xValue,
        y: yValue,
        value: Number(value),
        period,
      });
    }
  }
  
  return result;
}

async function getKPIWidgetData(widget: Widget, report: Report, userId: string): Promise<any> {
  if (!report.modelId) {
    return null;
  }
  
  // Extract component ID and configuration
  const { componentId, aggregationType, scenarioId, versionId, compareToScenarioId, compareToVersionId } = widget.config;
  
  if (!componentId) {
    return null;
  }
  
  // Get time series data for the current scenario/version
  const currentData = await getTimeSeriesData(
    [componentId],
    scenarioId,
    versionId,
    'system' // Using system token for now
  );
  
  // Calculate current value
  const currentValue = aggregateTimeSeriesData(
    currentData,
    componentId,
    { type: aggregationType || AggregationType.LAST }
  );
  
  // If comparison is requested, get comparison data
  let previousValue = null;
  
  if (compareToScenarioId || compareToVersionId) {
    const comparisonData = await getTimeSeriesData(
      [componentId],
      compareToScenarioId || null,
      compareToVersionId || null,
      'system' // Using system token for now
    );
    
    previousValue = aggregateTimeSeriesData(
      comparisonData,
      componentId,
      { type: aggregationType || AggregationType.LAST }
    );
  }
  
  // Get component details from the model
  const model = await getModel(report.modelId, 'system');
  const component = model?.components.find(c => c.id === componentId);
  
  return {
    name: component?.name || componentId,
    value: currentValue !== null ? currentValue : 0,
    previousValue: previousValue !== null ? previousValue : undefined,
    format: widget.config.format || (component?.dataType === 'CURRENCY' ? 'currency' : 
                                   component?.dataType === 'PERCENTAGE' ? 'percentage' : 'number'),
  };
}
