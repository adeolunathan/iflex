// services/analytics-service/src/utils/report-scheduler.ts

import cron from 'node-cron';
import nodemailer from 'nodemailer';
import { pgPool } from '../db';
import { config } from '../config';
import { ScheduleFrequency, ReportSchedule } from '../types';
import { getReportData } from './report-generator';

// Set up email transporter
const transporter = nodemailer.createTransport({
  host: config.smtpHost,
  port: config.smtpPort,
  secure: config.smtpPort === 465,
  auth: {
    user: config.smtpUser,
    pass: config.smtpPass,
  },
});

// Initialize scheduler
export function initializeScheduler(): void {
  // Check for reports to send every hour
  cron.schedule('0 * * * *', async () => {
    try {
      await processScheduledReports();
    } catch (error) {
      console.error('Error processing scheduled reports:', error);
    }
  });
}

async function processScheduledReports(): Promise<void> {
  const now = new Date();
  
  // Get all active schedules that are due
  const { rows: schedules } = await pgPool.query(
    `SELECT s.*, r.name as report_name, r.id as report_id 
     FROM report_schedules s 
     JOIN reports r ON s.report_id = r.id 
     WHERE s.is_active = TRUE AND s.next_run_time <= $1`,
    [now]
  );
  
  // Process each schedule
  for (const schedule of schedules) {
    try {
      // Send the report
      await sendReport(schedule);
      
      // Update next run time
      const nextRunTime = calculateNextRunTime(schedule.frequency, now);
      
      // Update the schedule record
      await pgPool.query(
        `UPDATE report_schedules 
         SET next_run_time = $1, last_run_time = $2, last_run_status = $3, updated_at = $4 
         WHERE id = $5`,
        [nextRunTime, now, 'SUCCESS', now, schedule.id]
      );
    } catch (error) {
      console.error(`Error sending report ${schedule.report_id}:`, error);
      
      // Update the schedule record with failure
      await pgPool.query(
        `UPDATE report_schedules 
         SET last_run_time = $1, last_run_status = $2, updated_at = $3 
         WHERE id = $4`,
        [now, 'FAILED', now, schedule.id]
      );
    }
  }
}

async function sendReport(schedule: ReportSchedule & { report_name: string, report_id: string }): Promise<void> {
  // Get report data
  const reportData = await getReportData(schedule.report_id, 'system');
  
  if (!reportData) {
    throw new Error(`Report ${schedule.report_id} not found`);
  }
  
  // Generate HTML content from report data
  // In a real implementation, this would generate a nicely formatted HTML report
  const htmlContent = `
    <h1>${reportData.name}</h1>
    <p>${reportData.description || ''}</p>
    <p>This report was automatically generated on ${new Date().toLocaleString()}</p>
    
    <h2>Report Data</h2>
    <pre>${JSON.stringify(reportData, null, 2)}</pre>
  `;
  
  // Send email to each recipient
  for (const recipient of schedule.recipients) {
    await transporter.sendMail({
      from: config.smtpFrom,
      to: recipient,
      subject: `FinanceForge Report: ${schedule.report_name}`,
      html: htmlContent,
    });
  }
}

function calculateNextRunTime(frequency: ScheduleFrequency, now: Date): Date {
  const nextRun = new Date(now);
  
  switch (frequency) {
    case ScheduleFrequency.DAILY:
      nextRun.setDate(nextRun.getDate() + 1);
      break;
      
    case ScheduleFrequency.WEEKLY:
      nextRun.setDate(nextRun.getDate() + 7);
      break;
      
    case ScheduleFrequency.MONTHLY:
      nextRun.setMonth(nextRun.getMonth() + 1);
      break;
      
    case ScheduleFrequency.QUARTERLY:
      nextRun.setMonth(nextRun.getMonth() + 3);
      break;
      
    default:
      // Manual - set to far future
      nextRun.setFullYear(nextRun.getFullYear() + 100);
  }
  
  return nextRun;
}