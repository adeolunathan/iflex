// services/export-service/src/exporters/base-exporter.ts

import { ExportJob, ExportStatus } from '../types';
import { pgPool } from '../db';
import { saveExportedFile, getContentTypeForFormat } from '../utils/storage';

export abstract class BaseExporter {
  protected job: ExportJob;
  protected token: string;
  
  constructor(job: ExportJob, token: string) {
    this.job = job;
    this.token = token;
  }
  
  public abstract export(): Promise<Buffer>;
  
  protected async updateJobStatus(
    status: ExportStatus,
    fileUrl?: string,
    fileName?: string,
    fileSize?: number,
    errorMessage?: string
  ): Promise<void> {
    try {
      // Build update query
      let query = 'UPDATE export_jobs SET status = $1';
      const params: any[] = [status];
      let paramIndex = 2;
      
      if (status === ExportStatus.PROCESSING) {
        query += `, started_at = $${paramIndex++}`;
        params.push(new Date());
      }
      
      if (status === ExportStatus.COMPLETED || status === ExportStatus.FAILED) {
        query += `, completed_at = $${paramIndex++}`;
        params.push(new Date());
      }
      
      if (fileUrl) {
        query += `, file_url = $${paramIndex++}`;
        params.push(fileUrl);
      }
      
      if (fileName) {
        query += `, file_name = $${paramIndex++}`;
        params.push(fileName);
      }
      
      if (fileSize) {
        query += `, file_size = $${paramIndex++}`;
        params.push(fileSize);
      }
      
      if (errorMessage) {
        query += `, error_message = $${paramIndex++}`;
        params.push(errorMessage);
      }
      
      query += ` WHERE id = $${paramIndex}`;
      params.push(this.job.id);
      
      await pgPool.query(query, params);
    } catch (error) {
      console.error('Error updating job status:', error);
    }
  }
  
  public async process(): Promise<void> {
    try {
      // Update job status to processing
      await this.updateJobStatus(ExportStatus.PROCESSING);
      
      // Export the data
      const buffer = await this.export();
      
      // Generate file name
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${this.job.type.toLowerCase()}_${this.job.id}_${timestamp}.${this.getFileExtension()}`;
      
      // Save the file
      const contentType = getContentTypeForFormat(this.job.format);
      const fileUrl = await saveExportedFile(buffer, fileName, contentType);
      
      // Update job status to completed
      await this.updateJobStatus(
        ExportStatus.COMPLETED,
        fileUrl,
        fileName,
        buffer.length
      );
    } catch (error) {
      console.error('Error processing export job:', error);
      
      // Update job status to failed
      await this.updateJobStatus(
        ExportStatus.FAILED,
        undefined,
        undefined,
        undefined,
        error instanceof Error ? error.message : String(error)
      );
    }
  }
  
  protected getFileExtension(): string {
    switch (this.job.format) {
      case 'PDF':
        return 'pdf';
      case 'EXCEL':
        return 'xlsx';
      case 'CSV':
        return 'csv';
      case 'JSON':
        return 'json';
      case 'HTML':
        return 'html';
      default:
        return 'bin';
    }
  }
}