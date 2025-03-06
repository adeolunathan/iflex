// services/export-service/src/exporters/exporter-factory.ts

import { ExportFormat, ExportType, ExportJob } from '../types';
import { ModelExporter } from './model-exporter';
import { ReportExporter } from './report-exporter';
import { DataExporter } from './data-exporter';

export function createExporter(
  job: ExportJob,
  token: string
): ModelExporter | ReportExporter | DataExporter {
  switch (job.type) {
    case ExportType.MODEL:
      return new ModelExporter(job, token);
      
    case ExportType.REPORT:
      return new ReportExporter(job, token);
      
    case ExportType.DATA:
      return new DataExporter(job, token);
      
    default:
      throw new Error(`Unsupported export type: ${job.type}`);
  }
}