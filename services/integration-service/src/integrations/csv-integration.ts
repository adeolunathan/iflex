// services/integration-service/src/integrations/csv-integration.ts

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { BaseIntegration } from './base-integration';
import { DataMapping } from '../types';
import { parseCSV, applyMappings, CSVImportOptions } from '../utils/csv-helper';
import { config } from '../config';

export interface CSVIntegrationConfig {
  filePath?: string;
  fileUrl?: string;
  options: Partial<CSVImportOptions>;
  modelId?: string;
  targetEntity: string;
}

export class CSVIntegration extends BaseIntegration {
  private config: CSVIntegrationConfig;
  
  constructor(
    dataSourceId: string,
    mappings: DataMapping[],
    config: CSVIntegrationConfig
  ) {
    super(dataSourceId, mappings);
    this.config = config;
  }
  
  async execute(): Promise<any> {
    try {
      // Create a new job
      await this.createJob(this.config.modelId);
      await this.updateJobStatus('RUNNING');
      
      // Get the CSV file (from path or URL)
      let filePath = this.config.filePath;
      
      if (!filePath && this.config.fileUrl) {
        // Download file from URL
        filePath = path.join(config.fileUploadPath, `${this.jobId}.csv`);
        
        // Ensure directory exists
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        
        // Download file
        const response = await fetch(this.config.fileUrl);
        const fileStream = fs.createWriteStream(filePath);
        
        await new Promise((resolve, reject) => {
          response.body?.pipe(fileStream);
          response.body?.on('error', (err) => {
            reject(err);
          });
          fileStream.on('finish', function() {
            resolve(null);
          });
        });
      }
      
      if (!filePath) {
        throw new Error('No file path or URL provided');
      }
      
      // Parse CSV
      const data = await parseCSV(filePath, this.config.options);
      
      // Apply mappings
      const mappedData = applyMappings(data, this.mappings);
      
      // Import data to model
      if (this.config.modelId) {
        await this.importToModel(this.config.modelId, mappedData);
      }
      
      // Clean up downloaded file if it was from URL
      if (this.config.fileUrl && filePath) {
        fs.unlinkSync(filePath);
      }
      
      // Complete job
      await this.updateJobStatus('COMPLETED', mappedData.length);
      
      return {
        jobId: this.jobId,
        recordsProcessed: mappedData.length,
      };
    } catch (error) {
      console.error('CSV Integration error:', error);
      await this.updateJobStatus('FAILED', 0, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }
  
  private async importToModel(modelId: string, data: any[]): Promise<void> {
    // Call the model service to add the data
    // In a real implementation, this would use GraphQL or direct API calls
    
    // For now, we'll just log the data
    console.log(`Importing ${data.length} records to model ${modelId}`);
    console.log('Sample data:', data.slice(0, 2));
    
    // TODO: Implement actual import logic
  }
}