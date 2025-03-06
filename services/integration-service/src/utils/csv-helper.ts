// services/integration-service/src/utils/csv-helper.ts

import fs from 'fs';
import csv from 'csv-parser';
import { DataMapping } from '../types';

export interface CSVImportOptions {
  hasHeader: boolean;
  delimiter: string;
  skipRows: number;
  maxRows?: number;
  encoding: BufferEncoding;
}

export const defaultCSVOptions: CSVImportOptions = {
  hasHeader: true,
  delimiter: ',',
  skipRows: 0,
  encoding: 'utf-8',
};

export async function parseCSV(
  filePath: string,
  options: Partial<CSVImportOptions> = {}
): Promise<any[]> {
  const mergedOptions = { ...defaultCSVOptions, ...options };
  const results: any[] = [];
  
  return new Promise((resolve, reject) => {
    let rowCount = 0;
    let skippedRows = 0;
    
    fs.createReadStream(filePath, { encoding: mergedOptions.encoding })
      .pipe(csv({
        separator: mergedOptions.delimiter,
        headers: mergedOptions.hasHeader,
        skipLines: mergedOptions.skipRows,
      }))
      .on('data', (data) => {
        rowCount++;
        
        if (skippedRows < mergedOptions.skipRows) {
          skippedRows++;
          return;
        }
        
        if (mergedOptions.maxRows && rowCount > mergedOptions.maxRows) {
          return;
        }
        
        results.push(data);
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

export function applyMappings(data: any[], mappings: DataMapping[]): any[] {
  return data.map((row) => {
    const mappedRow: Record<string, any> = {};
    
    for (const mapping of mappings) {
      const sourceValue = row[mapping.sourceField];
      let transformedValue = sourceValue;
      
      // Apply transformation if specified
      if (mapping.transform) {
        try {
          // Simple transform functions
          // In a real implementation, this would be much more sophisticated
          // and include proper sandboxing for security
          const transformFn = new Function('value', `return ${mapping.transform}`);
          transformedValue = transformFn(sourceValue);
        } catch (error) {
          console.error(`Error applying transform: ${mapping.transform}`, error);
          transformedValue = sourceValue;
        }
      }
      
      // Apply data type conversion
      switch (mapping.dataType) {
        case 'NUMBER':
          mappedRow[mapping.targetField] = Number(transformedValue);
          break;
        case 'BOOLEAN':
          mappedRow[mapping.targetField] = Boolean(transformedValue);
          break;
        case 'DATE':
          mappedRow[mapping.targetField] = new Date(transformedValue);
          break;
        default:
          mappedRow[mapping.targetField] = String(transformedValue);
      }
    }
    
    return mappedRow;
  });
}