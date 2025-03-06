// services/export-service/src/exporters/data-exporter.ts

import ExcelJS from 'exceljs';
import { BaseExporter } from './base-exporter';
import { getTimeSeriesData } from '../utils/model-service';
import { ExportFormat } from '../types';

export class DataExporter extends BaseExporter {
  public async export(): Promise<Buffer> {
    // Get export configuration
    const { componentIds, periods, scenarioId, versionId } = this.job.config;
    
    if (!componentIds || componentIds.length === 0) {
      throw new Error('No component IDs specified for data export');
    }
    
    // Get time series data
    const timeSeriesData = await getTimeSeriesData(
      componentIds,
      scenarioId,
      versionId,
      this.token
    );
    
    // Filter by periods if specified
    const filteredData = periods && periods.length > 0
      ? timeSeriesData.filter(item => periods.includes(item.period))
      : timeSeriesData;
    
    // Group by period
    const periodMap: Record<string, Record<string, string>> = {};
    
    filteredData.forEach(item => {
      if (!periodMap[item.period]) {
        periodMap[item.period] = { period: item.period };
      }
      
      periodMap[item.period][item.componentId] = item.value;
    });
    
    // Sort periods
    const sortedPeriods = Object.keys(periodMap).sort();
    
    // Process based on format
    switch (this.job.format) {
      case ExportFormat.EXCEL:
        return this.exportToExcel(periodMap, sortedPeriods, componentIds);
        
      case ExportFormat.CSV:
        return this.exportToCsv(periodMap, sortedPeriods, componentIds);
        
      case ExportFormat.JSON:
        return this.exportToJson(filteredData);
        
      default:
        throw new Error(`Unsupported format for data export: ${this.job.format}`);
    }
  }
  
  private async exportToExcel(
    periodMap: Record<string, Record<string, string>>,
    periods: string[],
    componentIds: string[]
  ): Promise<Buffer> {
    // Create workbook
    const workbook = new ExcelJS.Workbook();
    
    // Add metadata
    workbook.creator = 'FinanceForge';
    workbook.lastModifiedBy = 'FinanceForge';
    workbook.created = new Date();
    workbook.modified = new Date();
    
    // Add data sheet
    const dataSheet = workbook.addWorksheet('Time Series Data');
    
    // Set up columns
    dataSheet.columns = [
      { header: 'Period', key: 'period', width: 20 },
      ...componentIds.map(id => ({ header: id, key: id, width: 20 })),
    ];
    
    // Add data rows
    dataSheet.addRows(
      periods.map(period => {
        const row: Record<string, any> = { period };
        
        componentIds.forEach(id => {
          row[id] = periodMap[period][id] || '';
        });
        
        return row;
      })
    );
    
    // Return as buffer
    return await workbook.xlsx.writeBuffer() as Buffer;
  }
  
  private exportToCsv(
    periodMap: Record<string, Record<string, string>>,
    periods: string[],
    componentIds: string[]
  ): Buffer {
    // Create CSV header
    const header = ['Period', ...componentIds].join(',');
    
    // Create CSV rows
    const rows = periods.map(period => {
      const values = [period];
      
      componentIds.forEach(id => {
        values.push(periodMap[period][id] || '');
      });
      
      return values.join(',');
    });
    
    // Combine header and rows
    const csvContent = [header, ...rows].join('\n');
    
    // Return as buffer
    return Buffer.from(csvContent, 'utf-8');
  }
  
  private exportToJson(timeSeriesData: any[]): Buffer {
    // Return as buffer
    return Buffer.from(JSON.stringify(timeSeriesData, null, 2), 'utf-8');
  }
}

// Helper function for formatting values
function formatValue(value: any, format?: string): string {
  if (value === undefined || value === null) {
    return '';
  }
  
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Number(value));
      
    case 'percentage':
      return `${Number(value).toFixed(1)}%`;
      
    default:
      return String(value);
  }
}