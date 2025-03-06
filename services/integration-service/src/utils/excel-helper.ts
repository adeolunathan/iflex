// services/integration-service/src/utils/excel-helper.ts

import XLSX from 'xlsx';
import { DataMapping } from '../types';

export interface ExcelImportOptions {
  sheetName?: string;
  sheetIndex?: number;
  hasHeader: boolean;
  skipRows: number;
  maxRows?: number;
  range?: string;
}

export const defaultExcelOptions: ExcelImportOptions = {
  hasHeader: true,
  skipRows: 0,
};

export function parseExcel(
  filePath: string,
  options: Partial<ExcelImportOptions> = {}
): any[] {
  const mergedOptions = { ...defaultExcelOptions, ...options };
  
  // Read the Excel file
  const workbook = XLSX.readFile(filePath);
  
  // Determine which sheet to use
  let sheetName = mergedOptions.sheetName;
  if (!sheetName) {
    if (mergedOptions.sheetIndex !== undefined) {
      sheetName = workbook.SheetNames[mergedOptions.sheetIndex];
    } else {
      sheetName = workbook.SheetNames[0];
    }
  }
  
  // Get the worksheet
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    throw new Error(`Sheet "${sheetName}" not found in the workbook`);
  }
  
  // Convert to JSON
  const jsonOptions: XLSX.Sheet2JSONOpts = {
    header: mergedOptions.hasHeader ? 1 : undefined,
    range: mergedOptions.range,
    defval: null,
  };
  
  let data = XLSX.utils.sheet_to_json(worksheet, jsonOptions);
  
  // Apply skipRows and maxRows
  if (mergedOptions.skipRows > 0) {
    data = data.slice(mergedOptions.skipRows);
  }
  
  if (mergedOptions.maxRows) {
    data = data.slice(0, mergedOptions.maxRows);
  }
  
  return data;
}
