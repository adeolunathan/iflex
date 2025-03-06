// services/export-service/src/services/job-processor.ts

import { redisClient, pgPool } from '../db';
import { ExportJob, ExportStatus } from '../types';
import { createExporter } from '../exporters/exporter-factory';
import { config } from '../config';

// Semaphore for controlling concurrent jobs
let runningJobs = 0;

// Process the next available job
export async function processNextJob(): Promise<void> {
  // Check if we can process more jobs
  if (runningJobs >= config.maxConcurrentJobs) {
    return;
  }
  
  try {
    // Increment running jobs count
    runningJobs++;
    
    // Get the next pending job
    const { rows } = await pgPool.query(
      'SELECT * FROM export_jobs WHERE status = $1 ORDER BY created_at ASC LIMIT 1',
      [ExportStatus.PENDING]
    );
    
    if (rows.length === 0) {
      // No pending jobs
      runningJobs--;
      return;
    }
    
    const job: ExportJob = rows[0];
    
    // Get a token for API calls
    const token = await getServiceToken();
    
    if (!token) {
      console.error('Failed to get service token for job processing');
      runningJobs--;
      return;
    }
    
    // Create and run the appropriate exporter
    const exporter = createExporter(job, token);
    await exporter.process();
  } catch (error) {
    console.error('Error processing job:', error);
  } finally {
    // Decrement running jobs count
    runningJobs--;
    
    // Check if there are more jobs to process
    if (runningJobs < config.maxConcurrentJobs) {
      setTimeout(processNextJob, 100);
    }
  }
}

// Start the job processor
export function startJobProcessor(): void {
  // Process jobs every 5 seconds
  setInterval(async () => {
    if (runningJobs < config.maxConcurrentJobs) {
      await processNextJob();
    }
  }, 5000);
  
  console.log('Job processor started');
}

// Clean up old jobs
export function startJobCleaner(): void {
  // Clean up old completed jobs every hour
  setInterval(async () => {
    try {
      const cutoffDate = new Date();
      cutoffDate.setSeconds(cutoffDate.getSeconds() - config.exportJobTTL);
      
      await pgPool.query(
        'DELETE FROM export_jobs WHERE status = $1 AND completed_at < $2',
        [ExportStatus.COMPLETED, cutoffDate]
      );
    } catch (error) {
      console.error('Error cleaning up old jobs:', error);
    }
  }, 3600000); // 1 hour
  
  console.log('Job cleaner started');
}

// Get a service token for API calls
async function getServiceToken(): Promise<string | null> {
  // In a real implementation, this would get a service-to-service token
  // For this example, we'll just return a placeholder
  return 'service-token';
}