// services/export-service/src/exporters/report-exporter.ts

import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { BaseExporter } from './base-exporter';
import { getReport, getWidgetData } from '../utils/analytics-service';
import { ExportFormat } from '../types';

export class ReportExporter extends BaseExporter {
  public async export(): Promise<Buffer> {
    // Get report data
    const report = await getReport(this.job.sourceId, this.token);
    
    if (!report) {
      throw new Error('Report not found or not accessible');
    }
    
    // Process based on format
    switch (this.job.format) {
      case ExportFormat.PDF:
        return this.exportToPdf(report);
        
      case ExportFormat.EXCEL:
        return this.exportToExcel(report);
        
      case ExportFormat.JSON:
        return this.exportToJson(report);
        
      case ExportFormat.HTML:
        return this.exportToHtml(report);
        
      default:
        throw new Error(`Unsupported format for report export: ${this.job.format}`);
    }
  }
  
  private async exportToPdf(report: any): Promise<Buffer> {
    // Create PDF document
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text(report.name, 14, 22);
    
    // Add description if available
    if (report.description) {
      doc.setFontSize(12);
      doc.text(report.description, 14, 32);
    }
    
    let yPos = 40;
    
    // Add widgets
    for (const widget of report.widgets) {
      // Start a new page if we're too far down
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      // Add widget title
      doc.setFontSize(14);
      doc.text(widget.name, 14, yPos);
      yPos += 6;
      
      // Add widget description if available
      if (widget.description) {
        doc.setFontSize(10);
        doc.text(widget.description, 14, yPos);
        yPos += 6;
      }
      
      // Get widget data
      const widgetData = await getWidgetData(widget.id, this.token);
      
      if (widgetData) {
        // Add data based on widget type
        switch (widget.type) {
          case 'TABLE':
            if (Array.isArray(widgetData) && widgetData.length > 0) {
              const headers = Object.keys(widgetData[0]);
              
              // @ts-ignore jspdf-autotable augments jsPDF
              doc.autoTable({
                startY: yPos,
                head: [headers],
                body: widgetData.map((row: any) => headers.map(h => row[h])),
              });
              
              // Update position after table
              yPos = (doc as any).lastAutoTable.finalY + 10;
            }
            break;
            
          case 'METRICS':
            if (Array.isArray(widgetData) && widgetData.length > 0) {
              // @ts-ignore jspdf-autotable augments jsPDF
              doc.autoTable({
                startY: yPos,
                head: [['Metric', 'Value']],
                body: widgetData.map((metric: any) => [
                  metric.name,
                  formatValue(metric.value, metric.format),
                ]),
              });
              
              // Update position after table
              yPos = (doc as any).lastAutoTable.finalY + 10;
            }
            break;
            
          case 'KPI':
            if (widgetData) {
              doc.setFontSize(12);
              doc.text(`${widgetData.name}: ${formatValue(widgetData.value, widgetData.format)}`, 14, yPos);
              yPos += 8;
              
              if (widgetData.previousValue !== undefined) {
                const change = ((widgetData.value - widgetData.previousValue) / Math.abs(widgetData.previousValue)) * 100;
                doc.setFontSize(10);
                doc.text(`vs Previous: ${change.toFixed(1)}%`, 14, yPos);
                yPos += 8;
              }
            }
            break;
            
          default:
            // For other widget types, just mention they're included in the report
            doc.setFontSize(10);
            doc.text(`[${widget.type} visualization - included in report]`, 14, yPos);
            yPos += 8;
            break;
        }
      } else {
        // No data available
        doc.setFontSize(10);
        doc.text('No data available for this widget', 14, yPos);
        yPos += 8;
      }
      
      // Add spacing between widgets
      yPos += 10;
    }
    
    // Return as buffer
    return Buffer.from(doc.output('arraybuffer'));
  }
  
  private async exportToExcel(report: any): Promise<Buffer> {
    // Create workbook
    const workbook = new ExcelJS.Workbook();
    
    // Add metadata
    workbook.creator = 'FinanceForge';
    workbook.lastModifiedBy = 'FinanceForge';
    workbook.created = new Date();
    workbook.modified = new Date();
    
    // Add Report Info sheet
    const infoSheet = workbook.addWorksheet('Report Info');
    
    infoSheet.columns = [
      { header: 'Property', key: 'property', width: 20 },
      { header: 'Value', key: 'value', width: 50 },
    ];
    
    infoSheet.addRows([
      { property: 'Report Name', value: report.name },
      { property: 'Description', value: report.description || '' },
      { property: 'ID', value: report.id },
      { property: 'Type', value: report.type },
      { property: 'Model ID', value: report.modelId || 'N/A' },
    ]);
    
    // Add Widgets sheet
    const widgetsSheet = workbook.addWorksheet('Widgets');
    
    widgetsSheet.columns = [
      { header: 'ID', key: 'id', width: 36 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Description', key: 'description', width: 40 },
    ];
    
    widgetsSheet.addRows(
      report.widgets.map((widget: any) => ({
        id: widget.id,
        name: widget.name,
        type: widget.type,
        description: widget.description || '',
      }))
    );
    
    // Add data for each widget in separate sheets
    for (const widget of report.widgets) {
      const widgetData = await getWidgetData(widget.id, this.token);
      
      if (widgetData && (Array.isArray(widgetData) ? widgetData.length > 0 : true)) {
        // Limit sheet name to 31 characters (Excel limitation)
        const sheetName = widget.name.substring(0, 31).replace(/[\[\]\*\/\\\?:]/g, '_');
        const sheet = workbook.addWorksheet(sheetName);
        
        switch (widget.type) {
          case 'TABLE':
          case 'TIME_SERIES':
            if (Array.isArray(widgetData) && widgetData.length > 0) {
              // Get column headers
              const headers = Object.keys(widgetData[0]);
              
              // Set up columns
              sheet.columns = headers.map(header => ({
                header,
                key: header,
                width: 20,
              }));
              
              // Add data rows
              sheet.addRows(widgetData);
            }
            break;
            
          case 'METRICS':
            if (Array.isArray(widgetData)) {
              sheet.columns = [
                { header: 'Metric', key: 'metric', width: 30 },
                { header: 'Value', key: 'value', width: 20 },
              ];
              
              sheet.addRows(
                widgetData.map((metric: any) => ({
                  metric: metric.name,
                  value: metric.value,
                }))
              );
            }
            break;
            
          case 'KPI':
            sheet.columns = [
              { header: 'Property', key: 'property', width: 30 },
              { header: 'Value', key: 'value', width: 20 },
            ];
            
            const rows = [
              { property: 'Name', value: widgetData.name },
              { property: 'Value', value: widgetData.value },
            ];
            
            if (widgetData.previousValue !== undefined) {
              rows.push({ property: 'Previous Value', value: widgetData.previousValue });
              
              const change = ((widgetData.value - widgetData.previousValue) / Math.abs(widgetData.previousValue)) * 100;
              rows.push({ property: 'Change (%)', value: change.toFixed(1) + '%' });
            }
            
            sheet.addRows(rows);
            break;
            
          default:
            sheet.columns = [
              { header: 'Property', key: 'property', width: 30 },
              { header: 'Value', key: 'value', width: 20 },
            ];
            
            sheet.addRows([
              { property: 'Widget Type', value: widget.type },
              { property: 'Data', value: 'See JSON export for full data' },
            ]);
            break;
        }
      }
    }
    
    // Return as buffer
    return await workbook.xlsx.writeBuffer() as Buffer;
  }
  
  private async exportToJson(report: any): Promise<Buffer> {
    // Create a deep copy of the report
    const result = JSON.parse(JSON.stringify(report));
    
    // Add data for each widget
    for (const widget of result.widgets) {
      widget.data = await getWidgetData(widget.id, this.token);
    }
    
    // Return as buffer
    return Buffer.from(JSON.stringify(result, null, 2), 'utf-8');
  }
  
  private async exportToHtml(report: any): Promise<Buffer> {
    // Generate widget HTML
    const widgetHtml = await Promise.all(
      report.widgets.map(async (widget: any) => {
        const widgetData = await getWidgetData(widget.id, this.token);
        
        let dataHtml = '<p>No data available for this widget</p>';
        
        if (widgetData) {
          switch (widget.type) {
            case 'TABLE':
              if (Array.isArray(widgetData) && widgetData.length > 0) {
                const headers = Object.keys(widgetData[0]);
                const headerHtml = headers.map(h => `<th>${h}</th>`).join('');
                
                const rowsHtml = widgetData.map((row: any) => `
                  <tr>
                    ${headers.map(h => `<td>${row[h] !== undefined ? row[h] : ''}</td>`).join('')}
                  </tr>
                `).join('');
                
                dataHtml = `
                  <table>
                    <thead>
                      <tr>${headerHtml}</tr>
                    </thead>
                    <tbody>
                      ${rowsHtml}
                    </tbody>
                  </table>
                `;
              }
              break;
              
            case 'METRICS':
              if (Array.isArray(widgetData) && widgetData.length > 0) {
                const metricsHtml = widgetData.map((metric: any) => `
                  <tr>
                    <td>${metric.name}</td>
                    <td>${formatValue(metric.value, metric.format)}</td>
                  </tr>
                `).join('');
                
                dataHtml = `
                  <table>
                    <thead>
                      <tr>
                        <th>Metric</th>
                        <th>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${metricsHtml}
                    </tbody>
                  </table>
                `;
              }
              break;
              
            case 'KPI':
              if (widgetData) {
                dataHtml = `
                  <div class="kpi">
                    <h3>${widgetData.name}</h3>
                    <div class="value">${formatValue(widgetData.value, widgetData.format)}</div>
                `;
                
                if (widgetData.previousValue !== undefined) {
                  const change = ((widgetData.value - widgetData.previousValue) / Math.abs(widgetData.previousValue)) * 100;
                  const changeClass = change >= 0 ? 'positive' : 'negative';
                  
                  dataHtml += `
                    <div class="change ${changeClass}">
                      ${change >= 0 ? '+' : ''}${change.toFixed(1)}%
                    </div>
                  `;
                }
                
                dataHtml += '</div>';
              }
              break;
              
            default:
              dataHtml = `<p>[${widget.type} visualization - See JSON export for data]</p>`;
              break;
          }
        }
        
        return `
          <div class="widget">
            <h2>${widget.name}</h2>
            ${widget.description ? `<p>${widget.description}</p>` : ''}
            <div class="widget-data">
              ${dataHtml}
            </div>
          </div>
        `;
      })
    );
    
    // Create HTML content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${report.name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1, h2, h3 { color: #333; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .widget { margin-bottom: 30px; border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
          .kpi { text-align: center; }
          .kpi .value { font-size: 24px; font-weight: bold; margin: 10px 0; }
          .kpi .change { font-size: 16px; }
          .positive { color: green; }
          .negative { color: red; }
        </style>
      </head>
      <body>
        <h1>${report.name}</h1>
        <p>${report.description || ''}</p>
        
        <div class="report-info">
          <p><strong>Report ID:</strong> ${report.id}</p>
          <p><strong>Type:</strong> ${report.type}</p>
          <p><strong>Model ID:</strong> ${report.modelId || 'N/A'}</p>
        </div>
        
        <div class="widgets">
          ${widgetHtml.join('')}
        </div>
      </body>
      </html>
    `;
    
    // Return as buffer
    return Buffer.from(htmlContent, 'utf-8');
  }
}