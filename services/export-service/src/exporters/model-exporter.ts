// services/export-service/src/exporters/model-exporter.ts

import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { BaseExporter } from './base-exporter';
import { getModel, getTimeSeriesData } from '../utils/model-service';
import { ExportFormat } from '../types';

export class ModelExporter extends BaseExporter {
  public async export(): Promise<Buffer> {
    // Get model data
    const model = await getModel(this.job.sourceId, this.token);
    
    if (!model) {
      throw new Error('Model not found or not accessible');
    }
    
    // Process based on format
    switch (this.job.format) {
      case ExportFormat.PDF:
        return this.exportToPdf(model);
        
      case ExportFormat.EXCEL:
        return this.exportToExcel(model);
        
      case ExportFormat.CSV:
        return this.exportToCsv(model);
        
      case ExportFormat.JSON:
        return this.exportToJson(model);
        
      case ExportFormat.HTML:
        return this.exportToHtml(model);
        
      default:
        throw new Error(`Unsupported format: ${this.job.format}`);
    }
  }
  
  private async exportToPdf(model: any): Promise<Buffer> {
    // Create PDF document
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text(model.name, 14, 22);
    
    // Add description if available
    if (model.description) {
      doc.setFontSize(12);
      doc.text(model.description, 14, 32);
    }
    
    // Add model info
    doc.setFontSize(12);
    doc.text(`Model ID: ${model.id}`, 14, 42);
    doc.text(`Period: ${model.startDate} to ${model.endDate}`, 14, 48);
    doc.text(`Time Period: ${model.timePeriod}`, 14, 54);
    
    // Add components table
    // @ts-ignore jspdf-autotable augments jsPDF
    doc.autoTable({
      startY: 60,
      head: [['ID', 'Name', 'Type', 'Data Type', 'Formula']],
      body: model.components.map((component: any) => [
        component.id,
        component.name,
        component.type,
        component.dataType,
        component.formula || '',
      ]),
    });
    
    // Get time series data for output components
    const outputComponents = model.components.filter(
      (component: any) => component.type !== 'INPUT'
    );
    
    if (outputComponents.length > 0) {
      const componentIds = outputComponents.map((component: any) => component.id);
      const timeSeriesData = await getTimeSeriesData(componentIds, null, null, this.token);
      
      if (timeSeriesData.length > 0) {
        // Group by period
        const periodMap: Record<string, Record<string, string>> = {};
        
        timeSeriesData.forEach((item) => {
          if (!periodMap[item.period]) {
            periodMap[item.period] = { period: item.period };
          }
          
          const component = model.components.find(
            (c: any) => c.id === item.componentId
          );
          const name = component ? component.name : item.componentId;
          
          periodMap[item.period][name] = item.value;
        });
        
        // Sort periods
        const periods = Object.keys(periodMap).sort();
        
        // Create results table
        const componentNames = outputComponents.map((c: any) => c.name);
        
        // Add a new page for time series data
        doc.addPage();
        doc.setFontSize(16);
        doc.text('Time Series Data', 14, 22);
        
        // @ts-ignore jspdf-autotable augments jsPDF
        doc.autoTable({
          startY: 30,
          head: [['Period', ...componentNames]],
          body: periods.map((period) => [
            period,
            ...componentNames.map((name) => periodMap[period][name] || ''),
          ]),
        });
      }
    }
    
    // Return as buffer
    return Buffer.from(doc.output('arraybuffer'));
  }
  
  private async exportToExcel(model: any): Promise<Buffer> {
    // Create workbook
    const workbook = new ExcelJS.Workbook();
    
    // Add metadata
    workbook.creator = 'FinanceForge';
    workbook.lastModifiedBy = 'FinanceForge';
    workbook.created = new Date();
    workbook.modified = new Date();
    
    // Add Model Info sheet
    const infoSheet = workbook.addWorksheet('Model Info');
    
    infoSheet.columns = [
      { header: 'Property', key: 'property', width: 20 },
      { header: 'Value', key: 'value', width: 50 },
    ];
    
    infoSheet.addRows([
      { property: 'Model Name', value: model.name },
      { property: 'Description', value: model.description || '' },
      { property: 'ID', value: model.id },
      { property: 'Start Date', value: model.startDate },
      { property: 'End Date', value: model.endDate },
      { property: 'Time Period', value: model.timePeriod },
      { property: 'Period Count', value: model.periodCount },
    ]);
    
    // Add Components sheet
    const componentsSheet = workbook.addWorksheet('Components');
    
    componentsSheet.columns = [
      { header: 'ID', key: 'id', width: 36 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Data Type', key: 'dataType', width: 15 },
      { header: 'Formula', key: 'formula', width: 50 },
      { header: 'Description', key: 'description', width: 30 },
    ];
    
    componentsSheet.addRows(
      model.components.map((component: any) => ({
        id: component.id,
        name: component.name,
        type: component.type,
        dataType: component.dataType,
        formula: component.formula || '',
        description: component.description || '',
      }))
    );
    
    // Get time series data for output components
    const outputComponents = model.components.filter(
      (component: any) => component.type !== 'INPUT'
    );
    
    if (outputComponents.length > 0) {
      const componentIds = outputComponents.map((component: any) => component.id);
      const timeSeriesData = await getTimeSeriesData(componentIds, null, null, this.token);
      
      if (timeSeriesData.length > 0) {
        // Group by period
        const periodMap: Record<string, Record<string, string>> = {};
        
        timeSeriesData.forEach((item) => {
          if (!periodMap[item.period]) {
            periodMap[item.period] = { period: item.period };
          }
          
          const component = model.components.find(
            (c: any) => c.id === item.componentId
          );
          const name = component ? component.name : item.componentId;
          
          periodMap[item.period][name] = item.value;
        });
        
        // Sort periods
        const periods = Object.keys(periodMap).sort();
        
        // Add Results sheet
        const resultsSheet = workbook.addWorksheet('Results');
        
        // Set up columns
        const componentNames = outputComponents.map((c: any) => c.name);
        
        resultsSheet.columns = [
          { header: 'Period', key: 'period', width: 20 },
          ...componentNames.map((name) => ({ header: name, key: name, width: 20 })),
        ];
        
        // Add data rows
        resultsSheet.addRows(
          periods.map((period) => {
            const row: Record<string, any> = { period };
            
            componentNames.forEach((name) => {
              row[name] = periodMap[period][name] || '';
            });
            
            return row;
          })
        );
      }
    }
    
    // Return as buffer
    return await workbook.xlsx.writeBuffer() as Buffer;
  }
  
  private async exportToCsv(model: any): Promise<Buffer> {
    // Get time series data for output components
    const outputComponents = model.components.filter(
      (component: any) => component.type !== 'INPUT'
    );
    
    if (outputComponents.length === 0) {
      throw new Error('No output components found in model');
    }
    
    const componentIds = outputComponents.map((component: any) => component.id);
    const timeSeriesData = await getTimeSeriesData(componentIds, null, null, this.token);
    
    if (timeSeriesData.length === 0) {
      throw new Error('No time series data found for model components');
    }
    
    // Group by period
    const periodMap: Record<string, Record<string, string>> = {};
    
    timeSeriesData.forEach((item) => {
      if (!periodMap[item.period]) {
        periodMap[item.period] = { period: item.period };
      }
      
      const component = model.components.find(
        (c: any) => c.id === item.componentId
      );
      const name = component ? component.name : item.componentId;
      
      periodMap[item.period][name] = item.value;
    });
    
    // Sort periods
    const periods = Object.keys(periodMap).sort();
    
    // Create CSV content
    const componentNames = outputComponents.map((c: any) => c.name);
    const header = ['Period', ...componentNames].join(',');
    
    const rows = periods.map((period) => {
      const values = [period];
      
      componentNames.forEach((name) => {
        values.push(periodMap[period][name] || '');
      });
      
      return values.join(',');
    });
    
    const csvContent = [header, ...rows].join('\n');
    
    // Return as buffer
    return Buffer.from(csvContent, 'utf-8');
  }
  
  private async exportToJson(model: any): Promise<Buffer> {
    // Get time series data for output components
    const outputComponents = model.components.filter(
      (component: any) => component.type !== 'INPUT'
    );
    
    const componentIds = outputComponents.map((component: any) => component.id);
    const timeSeriesData = await getTimeSeriesData(componentIds, null, null, this.token);
    
    // Create JSON structure
    const result = {
      model: {
        id: model.id,
        name: model.name,
        description: model.description,
        startDate: model.startDate,
        endDate: model.endDate,
        timePeriod: model.timePeriod,
        periodCount: model.periodCount,
      },
      components: model.components,
      timeSeriesData,
    };
    
    // Return as buffer
    return Buffer.from(JSON.stringify(result, null, 2), 'utf-8');
  }
  
  private async exportToHtml(model: any): Promise<Buffer> {
    // Get time series data for output components
    const outputComponents = model.components.filter(
      (component: any) => component.type !== 'INPUT'
    );
    
    const componentIds = outputComponents.map((component: any) => component.id);
    const timeSeriesData = await getTimeSeriesData(componentIds, null, null, this.token);
    
    // Group by period
    const periodMap: Record<string, Record<string, string>> = {};
    
    timeSeriesData.forEach((item) => {
      if (!periodMap[item.period]) {
        periodMap[item.period] = { period: item.period };
      }
      
      const component = model.components.find(
        (c: any) => c.id === item.componentId
      );
      const name = component ? component.name : item.componentId;
      
      periodMap[item.period][name] = item.value;
    });
    
    // Sort periods
    const periods = Object.keys(periodMap).sort();
    
    // Create component table rows
    const componentRows = model.components.map((component: any) => `
      <tr>
        <td>${component.id}</td>
        <td>${component.name}</td>
        <td>${component.type}</td>
        <td>${component.dataType}</td>
        <td>${component.formula || ''}</td>
        <td>${component.description || ''}</td>
      </tr>
    `).join('');
    
    // Create time series table headers and rows
    const componentNames = outputComponents.map((c: any) => c.name);
    const timeSeriesHeaders = componentNames.map(name => `<th>${name}</th>`).join('');
    
    const timeSeriesRows = periods.map(period => {
      const cells = componentNames.map(name => 
        `<td>${periodMap[period][name] || ''}</td>`
      ).join('');
      
      return `
        <tr>
          <td>${period}</td>
          ${cells}
        </tr>
      `;
    }).join('');
    
    // Create HTML content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${model.name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1, h2 { color: #333; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          tr:nth-child(even) { background-color: #f9f9f9; }
        </style>
      </head>
      <body>
        <h1>${model.name}</h1>
        <p>${model.description || ''}</p>
        
        <h2>Model Information</h2>
        <table>
          <tr><th>Property</th><th>Value</th></tr>
          <tr><td>ID</td><td>${model.id}</td></tr>
          <tr><td>Start Date</td><td>${model.startDate}</td></tr>
          <tr><td>End Date</td><td>${model.endDate}</td></tr>
          <tr><td>Time Period</td><td>${model.timePeriod}</td></tr>
          <tr><td>Period Count</td><td>${model.periodCount}</td></tr>
        </table>
        
        <h2>Components</h2>
        <table>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Type</th>
            <th>Data Type</th>
            <th>Formula</th>
            <th>Description</th>
          </tr>
          ${componentRows}
        </table>
        
        ${timeSeriesRows ? `
          <h2>Time Series Data</h2>
          <table>
            <tr>
              <th>Period</th>
              ${timeSeriesHeaders}
            </tr>
            ${timeSeriesRows}
          </table>
        ` : ''}
      </body>
      </html>
    `;
    
    // Return as buffer
    return Buffer.from(htmlContent, 'utf-8');
  }
}
