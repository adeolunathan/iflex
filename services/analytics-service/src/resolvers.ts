// services/analytics-service/src/resolvers.ts

import { v4 as uuidv4 } from 'uuid';
import { ApolloError, AuthenticationError, ForbiddenError } from 'apollo-server-express';
import { pgPool } from './db';
import { 
  Report, 
  Widget, 
  ReportSchedule, 
  AnalyticsMetric, 
  ReportType, 
  WidgetType, 
  ScheduleFrequency, 
  Position
} from './types';
import { getReportData } from './utils/report-generator';
import { getModel } from './utils/model-service';
import { setCachedQuery, getCachedQuery, invalidateCache } from './utils/cache';

export const resolvers = {
  Query: {
    report: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      try {
        // Check for cached result
        const cacheKey = `report:${id}:${context.user.id}`;
        const cachedReport = await getCachedQuery('report', { id, userId: context.user.id });
        
        if (cachedReport) {
          return cachedReport;
        }
        
        // Get report
        const { rows } = await pgPool.query(
          `SELECT * FROM reports 
           WHERE id = $1 
           AND (organization_id = $2 OR is_public = TRUE)`,
          [id, context.user.organizationId]
        );
        
        if (rows.length === 0) {
          return null;
        }
        
        const report = rows[0];
        
        // Get widgets
        const { rows: widgetRows } = await pgPool.query(
          'SELECT * FROM widgets WHERE report_id = $1 ORDER BY created_at',
          [id]
        );
        
        report.widgets = widgetRows;
        
        // Parse JSON fields
        report.config = JSON.parse(report.config);
        report.tags = report.tags || [];
        
        report.widgets.forEach((widget: any) => {
          widget.config = JSON.parse(widget.config);
          widget.position = JSON.parse(widget.position);
        });
        
        // Cache the result
        await setCachedQuery('report', { id, userId: context.user.id }, report);
        
        return report;
      } catch (error) {
        console.error('Error fetching report:', error);
        throw new ApolloError('Failed to fetch report');
      }
    },
    
    reports: async (_: any, { organizationId, modelId }: { organizationId: string, modelId?: string }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      if (context.user.organizationId !== organizationId) {
        throw new ForbiddenError('Not authorized to access reports in this organization');
      }
      
      try {
        let query = `
          SELECT * FROM reports 
          WHERE organization_id = $1
        `;
        const params = [organizationId];
        
        if (modelId) {
          query += ' AND model_id = $2';
          params.push(modelId);
        }
        
        query += ' ORDER BY created_at DESC';
        
        const { rows } = await pgPool.query(query, params);
        
        // Parse JSON fields
        rows.forEach((report: any) => {
          report.config = JSON.parse(report.config);
          report.tags = report.tags || [];
          report.widgets = []; // Widgets will be fetched separately as needed
        });
        
        return rows;
      } catch (error) {
        console.error('Error fetching reports:', error);
        throw new ApolloError('Failed to fetch reports');
      }
    },
    
    reportsByType: async (_: any, { organizationId, type }: { organizationId: string, type: ReportType }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      if (context.user.organizationId !== organizationId) {
        throw new ForbiddenError('Not authorized to access reports in this organization');
      }
      
      try {
        const { rows } = await pgPool.query(
          'SELECT * FROM reports WHERE organization_id = $1 AND type = $2 ORDER BY created_at DESC',
          [organizationId, type]
        );
        
        // Parse JSON fields
        rows.forEach((report: any) => {
          report.config = JSON.parse(report.config);
          report.tags = report.tags || [];
          report.widgets = []; // Widgets will be fetched separately as needed
        });
        
        return rows;
      } catch (error) {
        console.error('Error fetching reports by type:', error);
        throw new ApolloError('Failed to fetch reports');
      }
    },
    
    widget: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      try {
        const { rows } = await pgPool.query(
          `SELECT w.* 
           FROM widgets w
           JOIN reports r ON w.report_id = r.id
           WHERE w.id = $1 
           AND (r.organization_id = $2 OR r.is_public = TRUE)`,
          [id, context.user.organizationId]
        );
        
        if (rows.length === 0) {
          return null;
        }
        
        const widget = rows[0];
        
        // Parse JSON fields
        widget.config = JSON.parse(widget.config);
        widget.position = JSON.parse(widget.position);
        
        return widget;
      } catch (error) {
        console.error('Error fetching widget:', error);
        throw new ApolloError('Failed to fetch widget');
      }
    },
    
    widgetData: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      try {
        // Get widget
        const { rows } = await pgPool.query(
          `SELECT w.*, r.id as report_id, r.model_id 
           FROM widgets w
           JOIN reports r ON w.report_id = r.id
           WHERE w.id = $1 
           AND (r.organization_id = $2 OR r.is_public = TRUE)`,
          [id, context.user.organizationId]
        );
        
        if (rows.length === 0) {
          throw new Error('Widget not found');
        }
        
        const widget = rows[0];
        widget.config = JSON.parse(widget.config);
        
        // Get widget data
        const report = { id: widget.report_id, modelId: widget.model_id };
        const data = await getWidgetData(widget, report as unknown as Report, context.user.id);
        
        return JSON.stringify(data);
      } catch (error) {
        console.error('Error fetching widget data:', error);
        throw new ApolloError('Failed to fetch widget data');
      }
    },
    
    reportSchedule: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      try {
        const { rows } = await pgPool.query(
          `SELECT s.* 
           FROM report_schedules s
           JOIN reports r ON s.report_id = r.id
           WHERE s.id = $1 
           AND r.organization_id = $2`,
          [id, context.user.organizationId]
        );
        
        if (rows.length === 0) {
          return null;
        }
        
        return rows[0];
      } catch (error) {
        console.error('Error fetching report schedule:', error);
        throw new ApolloError('Failed to fetch report schedule');
      }
    },
    
    reportSchedules: async (_: any, { reportId }: { reportId: string }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      try {
        const { rows } = await pgPool.query(
          `SELECT s.* 
           FROM report_schedules s
           JOIN reports r ON s.report_id = r.id
           WHERE s.report_id = $1 
           AND r.organization_id = $2`,
          [reportId, context.user.organizationId]
        );
        
        return rows;
      } catch (error) {
        console.error('Error fetching report schedules:', error);
        throw new ApolloError('Failed to fetch report schedules');
      }
    },
    
    metric: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      try {
        const { rows } = await pgPool.query(
          `SELECT * FROM analytics_metrics 
           WHERE id = $1 
           AND (organization_id = $2 OR is_public = TRUE)`,
          [id, context.user.organizationId]
        );
        
        if (rows.length === 0) {
          return null;
        }
        
        return rows[0];
      } catch (error) {
        console.error('Error fetching metric:', error);
        throw new ApolloError('Failed to fetch metric');
      }
    },
    
    metrics: async (_: any, { organizationId, modelId }: { organizationId: string, modelId?: string }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      if (context.user.organizationId !== organizationId) {
        throw new ForbiddenError('Not authorized to access metrics in this organization');
      }
      
      try {
        let query = `
          SELECT * FROM analytics_metrics 
          WHERE organization_id = $1 OR is_public = TRUE
        `;
        const params = [organizationId];
        
        if (modelId) {
          query += ' AND (model_id IS NULL OR model_id = $2)';
          params.push(modelId);
        }
        
        query += ' ORDER BY created_at DESC';
        
        const { rows } = await pgPool.query(query, params);
        
        return rows;
      } catch (error) {
        console.error('Error fetching metrics:', error);
        throw new ApolloError('Failed to fetch metrics');
      }
    },
  },
  
  Mutation: {
    createReport: async (_: any, { input }: { input: any }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      const client = await pgPool.connect();
      
      try {
        await client.query('BEGIN');
        
        const reportId = uuidv4();
        const now = new Date();
        
        // If modelId is provided, verify it exists and is accessible to the user
        if (input.modelId) {
          const model = await getModel(input.modelId, context.user.id);
          
          if (!model) {
            throw new Error('Model not found or not accessible');
          }
        }
        
        // Insert report
        const { rows } = await client.query(
          `INSERT INTO reports (
            id, name, description, type, model_id, organization_id, is_public, 
            config, tags, created_at, updated_at, created_by, updated_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
          [
            reportId,
            input.name,
            input.description || '',
            input.type,
            input.modelId || null,
            context.user.organizationId,
            input.isPublic !== undefined ? input.isPublic : false,
            input.config,
            input.tags || [],
            now,
            now,
            context.user.id,
            context.user.id,
          ]
        );
        
        await client.query('COMMIT');
        
        const report = rows[0];
        
        // Parse JSON fields
        report.config = JSON.parse(report.config);
        report.tags = report.tags || [];
        report.widgets = []; // No widgets yet
        
        // Invalidate cache
        await invalidateCache(`report:${reportId}:*`);
        
        return report;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating report:', error);
        throw new ApolloError('Failed to create report');
      } finally {
        client.release();
      }
    },
    
    updateReport: async (_: any, { id, input }: { id: string, input: any }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      const client = await pgPool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Check if report exists and user has access to it
        const { rows: checkRows } = await client.query(
          'SELECT * FROM reports WHERE id = $1 AND organization_id = $2',
          [id, context.user.organizationId]
        );
        
        if (checkRows.length === 0) {
          throw new ForbiddenError('Report not found or not accessible');
        }
        
        // Build update query
        let updateQuery = 'UPDATE reports SET updated_at = $1, updated_by = $2';
        const params = [new Date(), context.user.id];
        let paramIndex = 3;
        
        if (input.name !== undefined) {
          updateQuery += `, name = $${paramIndex++}`;
          params.push(input.name);
        }
        
        if (input.description !== undefined) {
          updateQuery += `, description = $${paramIndex++}`;
          params.push(input.description);
        }
        
        if (input.config !== undefined) {
          updateQuery += `, config = $${paramIndex++}`;
          params.push(input.config);
        }
        
        if (input.tags !== undefined) {
          updateQuery += `, tags = $${paramIndex++}`;
          params.push(input.tags);
        }
        
        if (input.isPublic !== undefined) {
          updateQuery += `, is_public = $${paramIndex++}`;
          params.push(input.isPublic);
        }
        
        updateQuery += ` WHERE id = $${paramIndex} RETURNING *`;
        params.push(id);
        
        // Update report
        const { rows } = await client.query(updateQuery, params);
        
        await client.query('COMMIT');
        
        const report = rows[0];
        
        // Get widgets
        const { rows: widgetRows } = await pgPool.query(
          'SELECT * FROM widgets WHERE report_id = $1',
          [id]
        );
        
        report.widgets = widgetRows;
        
        // Parse JSON fields
        report.config = JSON.parse(report.config);
        report.tags = report.tags || [];
        
        report.widgets.forEach((widget: any) => {
          widget.config = JSON.parse(widget.config);
          widget.position = JSON.parse(widget.position);
        });
        
        // Invalidate cache
        await invalidateCache(`report:${id}:*`);
        
        return report;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating report:', error);
        throw new ApolloError('Failed to update report');
      } finally {
        client.release();
      }
    },
    
    deleteReport: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      const client = await pgPool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Check if report exists and user has access to it
        const { rows } = await client.query(
          'SELECT * FROM reports WHERE id = $1 AND organization_id = $2',
          [id, context.user.organizationId]
        );
        
        if (rows.length === 0) {
          throw new ForbiddenError('Report not found or not accessible');
        }
        
        // Delete related records (cascade will handle widgets)
        await client.query('DELETE FROM report_schedules WHERE report_id = $1', [id]);
        
        // Delete report
        await client.query('DELETE FROM reports WHERE id = $1', [id]);
        
        await client.query('COMMIT');
        
        // Invalidate cache
        await invalidateCache(`report:${id}:*`);
        
        return true;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting report:', error);
        throw new ApolloError('Failed to delete report');
      } finally {
        client.release();
      }
    },
    
    addWidget: async (_: any, { reportId, input }: { reportId: string, input: any }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      const client = await pgPool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Check if report exists and user has access to it
        const { rows: reportRows } = await client.query(
          'SELECT * FROM reports WHERE id = $1 AND organization_id = $2',
          [reportId, context.user.organizationId]
        );
        
        if (reportRows.length === 0) {
          throw new ForbiddenError('Report not found or not accessible');
        }
        
        const widgetId = uuidv4();
        const now = new Date();
        
        // Insert widget
        const { rows } = await client.query(
          `INSERT INTO widgets (
            id, report_id, name, description, type, config, position,
            created_at, updated_at, created_by, updated_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
          [
            widgetId,
            reportId,
            input.name,
            input.description || '',
            input.type,
            input.config,
            JSON.stringify(input.position),
            now,
            now,
            context.user.id,
            context.user.id,
          ]
        );
        
        // Update report's updated_at timestamp
        await client.query(
          'UPDATE reports SET updated_at = $1, updated_by = $2 WHERE id = $3',
          [now, context.user.id, reportId]
        );
        
        await client.query('COMMIT');
        
        const widget = rows[0];
        
        // Parse JSON fields
        widget.config = JSON.parse(widget.config);
        widget.position = input.position;
        
        // Invalidate cache
        await invalidateCache(`report:${reportId}:*`);
        
        return widget;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error adding widget:', error);
        throw new ApolloError('Failed to add widget');
      } finally {
        client.release();
      }
    },
    
    updateWidget: async (_: any, { id, input }: { id: string, input: any }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      const client = await pgPool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Check if widget exists and user has access to it
        const { rows: widgetRows } = await client.query(
          `SELECT w.*, r.organization_id 
           FROM widgets w
           JOIN reports r ON w.report_id = r.id
           WHERE w.id = $1`,
          [id]
        );
        
        if (widgetRows.length === 0) {
          throw new Error('Widget not found');
        }
        
        const widget = widgetRows[0];
        
        if (widget.organization_id !== context.user.organizationId) {
          throw new ForbiddenError('Not authorized to update this widget');
        }
        
        // Build update query
        let updateQuery = 'UPDATE widgets SET updated_at = $1, updated_by = $2';
        const params = [new Date(), context.user.id];
        let paramIndex = 3;
        
        if (input.name !== undefined) {
          updateQuery += `, name = $${paramIndex++}`;
          params.push(input.name);
        }
        
        if (input.description !== undefined) {
          updateQuery += `, description = $${paramIndex++}`;
          params.push(input.description);
        }
        
        if (input.config !== undefined) {
          updateQuery += `, config = $${paramIndex++}`;
          params.push(input.config);
        }
        
        if (input.position !== undefined) {
          updateQuery += `, position = $${paramIndex++}`;
          params.push(JSON.stringify(input.position));
        }
        
        updateQuery += ` WHERE id = $${paramIndex} RETURNING *`;
        params.push(id);
        
        // Update widget
        const { rows } = await client.query(updateQuery, params);
        
        // Update report's updated_at timestamp
        await client.query(
          'UPDATE reports SET updated_at = $1, updated_by = $2 WHERE id = $3',
          [new Date(), context.user.id, widget.report_id]
        );
        
        await client.query('COMMIT');
        
        const updatedWidget = rows[0];
        
        // Parse JSON fields
        updatedWidget.config = JSON.parse(updatedWidget.config);
        updatedWidget.position = JSON.parse(updatedWidget.position);
        
        // Invalidate cache
        await invalidateCache(`report:${widget.report_id}:*`);
        
        return updatedWidget;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating widget:', error);
        throw new ApolloError('Failed to update widget');
      } finally {
        client.release();
      }
    },
    
    deleteWidget: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      const client = await pgPool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Check if widget exists and user has access to it
        const { rows: widgetRows } = await client.query(
          `SELECT w.*, r.organization_id 
           FROM widgets w
           JOIN reports r ON w.report_id = r.id
           WHERE w.id = $1`,
          [id]
        );
        
        if (widgetRows.length === 0) {
          throw new Error('Widget not found');
        }
        
        const widget = widgetRows[0];
        
        if (widget.organization_id !== context.user.organizationId) {
          throw new ForbiddenError('Not authorized to delete this widget');
        }
        
        // Delete widget
        await client.query('DELETE FROM widgets WHERE id = $1', [id]);
        
        // Update report's updated_at timestamp
        await client.query(
          'UPDATE reports SET updated_at = $1, updated_by = $2 WHERE id = $3',
          [new Date(), context.user.id, widget.report_id]
        );
        
        await client.query('COMMIT');
        
        // Invalidate cache
        await invalidateCache(`report:${widget.report_id}:*`);
        
        return true;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting widget:', error);
        throw new ApolloError('Failed to delete widget');
      } finally {
        client.release();
      }
    },
    
    createReportSchedule: async (_: any, { input }: { input: any }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      const client = await pgPool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Check if report exists and user has access to it
        const { rows: reportRows } = await client.query(
          'SELECT * FROM reports WHERE id = $1 AND organization_id = $2',
          [input.reportId, context.user.organizationId]
        );
        
        if (reportRows.length === 0) {
          throw new ForbiddenError('Report not found or not accessible');
        }
        
        const scheduleId = uuidv4();
        const now = new Date();
        
        // Calculate next run time based on frequency
        const nextRunTime = calculateNextRunTime(input.frequency, now);
        
        // Insert schedule
        const { rows } = await client.query(
          `INSERT INTO report_schedules (
            id, report_id, frequency, recipients, next_run_time, is_active,
            created_at, updated_at, created_by, updated_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
          [
            scheduleId,
            input.reportId,
            input.frequency,
            input.recipients,
            nextRunTime,
            input.isActive,
            now,
            now,
            context.user.id,
            context.user.id,
          ]
        );
        
        await client.query('COMMIT');
        
        return rows[0];
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating report schedule:', error);
        throw new ApolloError('Failed to create report schedule');
      } finally {
        client.release();
      }
    },
    
    updateReportSchedule: async (_: any, { id, input }: { id: string, input: any }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      const client = await pgPool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Check if schedule exists and user has access to it
        const { rows: scheduleRows } = await client.query(
          `SELECT s.*, r.organization_id 
           FROM report_schedules s
           JOIN reports r ON s.report_id = r.id
           WHERE s.id = $1`,
          [id]
        );
        
        if (scheduleRows.length === 0) {
          throw new Error('Schedule not found');
        }
        
        const schedule = scheduleRows[0];
        
        if (schedule.organization_id !== context.user.organizationId) {
          throw new ForbiddenError('Not authorized to update this schedule');
        }
        
        // Build update query
        let updateQuery = 'UPDATE report_schedules SET updated_at = $1, updated_by = $2';
        const params = [new Date(), context.user.id];
        let paramIndex = 3;
        
        // Calculate next run time if frequency changed
        let nextRunTime = null;
        if (input.frequency !== undefined && input.frequency !== schedule.frequency) {
          nextRunTime = calculateNextRunTime(input.frequency, new Date());
          
          updateQuery += `, frequency = $${paramIndex++}, next_run_time = $${paramIndex++}`;
          params.push(input.frequency, nextRunTime);
        }
        
        if (input.recipients !== undefined) {
          updateQuery += `, recipients = $${paramIndex++}`;
          params.push(input.recipients);
        }
        
        if (input.isActive !== undefined) {
          updateQuery += `, is_active = $${paramIndex++}`;
          params.push(input.isActive);
        }
        
        updateQuery += ` WHERE id = $${paramIndex} RETURNING *`;
        params.push(id);
        
        // Update schedule
        const { rows } = await client.query(updateQuery, params);
        
        await client.query('COMMIT');
        
        return rows[0];
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating report schedule:', error);
        throw new ApolloError('Failed to update report schedule');
      } finally {
        client.release();
      }
    },
    
    deleteReportSchedule: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      const client = await pgPool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Check if schedule exists and user has access to it
        const { rows: scheduleRows } = await client.query(
          `SELECT s.*, r.organization_id 
           FROM report_schedules s
           JOIN reports r ON s.report_id = r.id
           WHERE s.id = $1`,
          [id]
        );
        
        if (scheduleRows.length === 0) {
          throw new Error('Schedule not found');
        }
        
        const schedule = scheduleRows[0];
        
        if (schedule.organization_id !== context.user.organizationId) {
          throw new ForbiddenError('Not authorized to delete this schedule');
        }
        
        // Delete schedule
        await client.query('DELETE FROM report_schedules WHERE id = $1', [id]);
        
        await client.query('COMMIT');
        
        return true;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting report schedule:', error);
        throw new ApolloError('Failed to delete report schedule');
      } finally {
        client.release();
      }
    },
    
    sendReportNow: async (_: any, { reportId, recipients }: { reportId: string, recipients: string[] }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      try {
        // Check if report exists and user has access to it
        const { rows: reportRows } = await pgPool.query(
          'SELECT * FROM reports WHERE id = $1 AND organization_id = $2',
          [reportId, context.user.organizationId]
        );
        
        if (reportRows.length === 0) {
          throw new ForbiddenError('Report not found or not accessible');
        }
        
        // Create a manual schedule with the provided recipients
        const schedule = {
          report_id: reportId,
          recipients,
          report_name: reportRows[0].name,
        };
        
        // Send the report
        await sendReport(schedule as any);
        
        return true;
      } catch (error) {
        console.error('Error sending report:', error);
        throw new ApolloError('Failed to send report');
      }
    },
    
    createMetric: async (_: any, { input }: { input: any }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      const client = await pgPool.connect();
      
      try {
        await client.query('BEGIN');
        
        // If modelId is provided, verify it exists and is accessible to the user
        if (input.modelId) {
          const model = await getModel(input.modelId, context.user.id);
          
          if (!model) {
            throw new Error('Model not found or not accessible');
          }
        }
        
        const metricId = uuidv4();
        const now = new Date();
        
        // Insert metric
        const { rows } = await client.query(
          `INSERT INTO analytics_metrics (
            id, name, description, formula, model_id, organization_id, is_public,
            created_at, updated_at, created_by, updated_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
          [
            metricId,
            input.name,
            input.description || '',
            input.formula,
            input.modelId || null,
            context.user.organizationId,
            input.isPublic !== undefined ? input.isPublic : false,
            now,
            now,
            context.user.id,
            context.user.id,
          ]
        );
        
        await client.query('COMMIT');
        
        return rows[0];
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating metric:', error);
        throw new ApolloError('Failed to create metric');
      } finally {
        client.release();
      }
    },
    
    updateMetric: async (_: any, { id, input }: { id: string, input: any }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      const client = await pgPool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Check if metric exists and user has access to it
        const { rows: metricRows } = await client.query(
          'SELECT * FROM analytics_metrics WHERE id = $1 AND organization_id = $2',
          [id, context.user.organizationId]
        );
        
        if (metricRows.length === 0) {
          throw new ForbiddenError('Metric not found or not accessible');
        }
        
        // Build update query
        let updateQuery = 'UPDATE analytics_metrics SET updated_at = $1, updated_by = $2';
        const params = [new Date(), context.user.id];
        let paramIndex = 3;
        
        if (input.name !== undefined) {
          updateQuery += `, name = $${paramIndex++}`;
          params.push(input.name);
        }
        
        if (input.description !== undefined) {
          updateQuery += `, description = $${paramIndex++}`;
          params.push(input.description);
        }
        
        if (input.formula !== undefined) {
          updateQuery += `, formula = $${paramIndex++}`;
          params.push(input.formula);
        }
        
        if (input.isPublic !== undefined) {
          updateQuery += `, is_public = $${paramIndex++}`;
          params.push(input.isPublic);
        }
        
        updateQuery += ` WHERE id = $${paramIndex} RETURNING *`;
        params.push(id);
        
        // Update metric
        const { rows } = await client.query(updateQuery, params);
        
        await client.query('COMMIT');
        
        return rows[0];
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating metric:', error);
        throw new ApolloError('Failed to update metric');
      } finally {
        client.release();
      }
    },
    
    deleteMetric: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      const client = await pgPool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Check if metric exists and user has access to it
        const { rows: metricRows } = await client.query(
          'SELECT * FROM analytics_metrics WHERE id = $1 AND organization_id = $2',
          [id, context.user.organizationId]
        );
        
        if (metricRows.length === 0) {
          throw new ForbiddenError('Metric not found or not accessible');
        }
        
        // Delete metric
        await client.query('DELETE FROM analytics_metrics WHERE id = $1', [id]);
        
        await client.query('COMMIT');
        
        return true;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting metric:', error);
        throw new ApolloError('Failed to delete metric');
      } finally {
        client.release();
      }
    },
  },
};

function calculateNextRunTime(frequency: ScheduleFrequency, now: Date): Date {
  const nextRun = new Date(now);
  
  switch (frequency) {
    case ScheduleFrequency.DAILY:
      nextRun.setDate(nextRun.getDate() + 1);
      nextRun.setHours(8, 0, 0, 0); // 8:00 AM
      break;
      
    case ScheduleFrequency.WEEKLY:
      // Next Monday at 8:00 AM
      nextRun.setDate(nextRun.getDate() + ((7 - nextRun.getDay() + 1) % 7 || 7));
      nextRun.setHours(8, 0, 0, 0);
      break;
      
    case ScheduleFrequency.MONTHLY:
      // 1st of next month at 8:00 AM
      nextRun.setMonth(nextRun.getMonth() + 1);
      nextRun.setDate(1);
      nextRun.setHours(8, 0, 0, 0);
      break;
      
    case ScheduleFrequency.QUARTERLY:
      // First day of next quarter at 8:00 AM
      nextRun.setMonth(Math.floor(nextRun.getMonth() / 3) * 3 + 3);
      nextRun.setDate(1);
      nextRun.setHours(8, 0, 0, 0);
      break;
      
    default:
      // MANUAL - set to far future
      nextRun.setFullYear(nextRun.getFullYear() + 100);
  }
  
  return nextRun;
}

// Helper functions for report generation
async function getWidgetData(widget: any, report: any, userId: string): Promise<any> {
  // This is a simplified implementation
  // In a real system, this would fetch and process data based on widget type
  
  try {
    // Parse config if it's a string
    let config = widget.config;
    if (typeof config === 'string') {
      config = JSON.parse(config);
    }
    
    // Get model data if needed
    if (report.modelId && config.componentIds) {
      const componentIds = Array.isArray(config.componentIds) ? config.componentIds : [config.componentIds];
      
      // Simulated data response
      return {
        data: [
          { period: '2023-01', value: Math.random() * 1000 },
          { period: '2023-02', value: Math.random() * 1000 },
          { period: '2023-03', value: Math.random() * 1000 },
          { period: '2023-04', value: Math.random() * 1000 },
        ],
        componentIds,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting widget data:', error);
    return null;
  }
}

// helper function from report-scheduler.ts
async function sendReport(schedule: any): Promise<void> {
  // Simplified implementation
  console.log(`Sending report ${schedule.report_id} to recipients: ${schedule.recipients.join(', ')}`);
  // In a real implementation, this would:
  // 1. Generate the report
  // 2. Create a PDF or HTML
  // 3. Send email with the report
}
