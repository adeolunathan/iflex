// services/integration-service/src/integrations/base-integration.ts

import { DataMapping, IntegrationJob } from '../types';
import { pgPool } from '../db';
import { v4 as uuidv4 } from 'uuid';

export abstract class BaseIntegration {
  protected dataSourceId: string;
  protected jobId?: string;
  protected mappings: DataMapping[];
  
  constructor(dataSourceId: string, mappings: DataMapping[]) {
    this.dataSourceId = dataSourceId;
    this.mappings = mappings;
  }
  
  protected async createJob(modelId?: string): Promise<string> {
    const jobId = uuidv4();
    
    // Create a new job record
    await pgPool.query(
      `INSERT INTO integration_jobs (
        id, data_source_id, model_id, status, created_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        jobId,
        this.dataSourceId,
        modelId || null,
        'PENDING',
        new Date(),
        'system', // This should be replaced with the actual user ID
      ]
    );
    
    this.jobId = jobId;
    return jobId;
  }
  
  protected async updateJobStatus(
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED',
    recordsProcessed?: number,
    errorMessage?: string
  ): Promise<void> {
    if (!this.jobId) {
      throw new Error('Job not initialized. Call createJob first.');
    }
    
    const updates: any[] = [status, this.jobId];
    let query = 'UPDATE integration_jobs SET status = $1';
    let paramIndex = 3;
    
    if (status === 'RUNNING') {
      query += ', start_time = $' + paramIndex++;
      updates.splice(paramIndex - 3, 0, new Date());
    }
    
    if (status === 'COMPLETED' || status === 'FAILED') {
      query += ', end_time = $' + paramIndex++;
      updates.splice(paramIndex - 3, 0, new Date());
    }
    
    if (recordsProcessed !== undefined) {
      query += ', records_processed = $' + paramIndex++;
      updates.splice(paramIndex - 3, 0, recordsProcessed);
    }
    
    if (errorMessage) {
      query += ', error_message = $' + paramIndex++;
      updates.splice(paramIndex - 3, 0, errorMessage);
    }
    
    query += ' WHERE id = $2';
    
    await pgPool.query(query, updates);
  }
  
  abstract execute(): Promise<any>;
}
