// services/export-service/src/resolvers.ts

import { v4 as uuidv4 } from 'uuid';
import { ApolloError, AuthenticationError, ForbiddenError } from 'apollo-server-express';
import { pgPool } from './db';
import { ExportFormat, ExportType, ExportStatus } from './types';

export const resolvers = {
  Query: {
    exportJob: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      try {
        const { rows } = await pgPool.query(
          'SELECT * FROM export_jobs WHERE id = $1 AND organization_id = $2',
          [id, context.user.organizationId]
        );
        
        if (rows.length === 0) {
          return null;
        }
        
        const job = rows[0];
        
        // Parse JSON config
        job.config = JSON.parse(job.config);
        
        return job;
      } catch (error) {
        console.error('Error fetching export job:', error);
        throw new ApolloError('Failed to fetch export job');
      }
    },
    
    exportJobs: async (_: any, { organizationId }: { organizationId: string }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      if (context.user.organizationId !== organizationId) {
        throw new ForbiddenError('Not authorized to access exports in this organization');
      }
      
      try {
        const { rows } = await pgPool.query(
          'SELECT * FROM export_jobs WHERE organization_id = $1 ORDER BY created_at DESC',
          [organizationId]
        );
        
        // Parse JSON configs
        return rows.map(job => ({
          ...job,
          config: JSON.parse(job.config),
        }));
      } catch (error) {
        console.error('Error fetching export jobs:', error);
        throw new ApolloError('Failed to fetch export jobs');
      }
    },
    
    exportJobsByType: async (_: any, 
      { organizationId, type }: { organizationId: string, type: ExportType }, 
      context: any
    ) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      if (context.user.organizationId !== organizationId) {
        throw new ForbiddenError('Not authorized to access exports in this organization');
      }
      
      try {
        const { rows } = await pgPool.query(
          'SELECT * FROM export_jobs WHERE organization_id = $1 AND type = $2 ORDER BY created_at DESC',
          [organizationId, type]
        );
        
        // Parse JSON configs
        return rows.map(job => ({
          ...job,
          config: JSON.parse(job.config),
        }));
      } catch (error) {
        console.error('Error fetching export jobs by type:', error);
        throw new ApolloError('Failed to fetch export jobs');
      }
    },
    
    exportJobsBySource: async (_: any, { sourceId }: { sourceId: string }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      try {
        const { rows } = await pgPool.query(
          'SELECT * FROM export_jobs WHERE source_id = $1 AND organization_id = $2 ORDER BY created_at DESC',
          [sourceId, context.user.organizationId]
        );
        
        // Parse JSON configs
        return rows.map(job => ({
          ...job,
          config: JSON.parse(job.config),
        }));
      } catch (error) {
        console.error('Error fetching export jobs by source:', error);
        throw new ApolloError('Failed to fetch export jobs');
      }
    },
    
    exportTemplate: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      try {
        const { rows } = await pgPool.query(
          `SELECT * FROM export_templates 
           WHERE id = $1 AND (organization_id = $2 OR is_public = TRUE)`,
          [id, context.user.organizationId]
        );
        
        if (rows.length === 0) {
          return null;
        }
        
        const template = rows[0];
        
        // Parse JSON config
        template.config = JSON.parse(template.config);
        
        return template;
      } catch (error) {
        console.error('Error fetching export template:', error);
        throw new ApolloError('Failed to fetch export template');
      }
    },
    
    exportTemplates: async (_: any, { organizationId }: { organizationId: string }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      try {
        const { rows } = await pgPool.query(
          `SELECT * FROM export_templates 
           WHERE organization_id = $1 OR is_public = TRUE
           ORDER BY created_at DESC`,
          [organizationId]
        );
        
        // Parse JSON configs
        return rows.map(template => ({
          ...template,
          config: JSON.parse(template.config),
        }));
      } catch (error) {
        console.error('Error fetching export templates:', error);
        throw new ApolloError('Failed to fetch export templates');
      }
    },
    
    exportTemplatesByType: async (_: any, 
      { organizationId, type }: { organizationId: string, type: ExportType }, 
      context: any
    ) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      try {
        const { rows } = await pgPool.query(
          `SELECT * FROM export_templates 
           WHERE (organization_id = $1 OR is_public = TRUE) AND type = $2
           ORDER BY created_at DESC`,
          [organizationId, type]
        );
        
        // Parse JSON configs
        return rows.map(template => ({
          ...template,
          config: JSON.parse(template.config),
        }));
      } catch (error) {
        console.error('Error fetching export templates by type:', error);
        throw new ApolloError('Failed to fetch export templates');
      }
    },
  },
  
  Mutation: {
    createExportJob: async (_: any, { input }: { input: any }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      try {
        const jobId = uuidv4();
        
        // Validate format and type combination
        if (input.type === ExportType.DATA && input.format === ExportFormat.PDF) {
          throw new Error('PDF format is not supported for data exports');
        }
        
        if (input.type === ExportType.DATA && input.format === ExportFormat.HTML) {
          throw new Error('HTML format is not supported for data exports');
        }
        
        // Validate config
        let configObj = {};
        try {
          configObj = JSON.parse(input.config);
        } catch (error) {
          throw new Error('Invalid config JSON');
        }
        
        // Insert job
        const { rows } = await pgPool.query(
          `INSERT INTO export_jobs (
            id, user_id, organization_id, type, format, source_id, 
            config, status, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
          [
            jobId,
            context.user.id,
            context.user.organizationId,
            input.type,
            input.format,
            input.sourceId,
            input.config,
            ExportStatus.PENDING,
            new Date(),
          ]
        );
        
        const job = rows[0];
        
        // Parse JSON config
        job.config = JSON.parse(job.config);
        
        return job;
      } catch (error) {
        console.error('Error creating export job:', error);
        throw new ApolloError('Failed to create export job: ' + (error instanceof Error ? error.message : String(error)));
      }
    },
    
    cancelExportJob: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      try {
        // Check if job exists and user has access to it
        const { rows } = await pgPool.query(
          'SELECT * FROM export_jobs WHERE id = $1 AND organization_id = $2',
          [id, context.user.organizationId]
        );
        
        if (rows.length === 0) {
          throw new ForbiddenError('Export job not found or not accessible');
        }
        
        const job = rows[0];
        
        // Can only cancel jobs that are pending or processing
        if (job.status !== ExportStatus.PENDING && job.status !== ExportStatus.PROCESSING) {
          throw new Error('Cannot cancel job that is not pending or processing');
        }
        
        // Update job status to failed
        await pgPool.query(
          'UPDATE export_jobs SET status = $1, completed_at = $2, error_message = $3 WHERE id = $4',
          [ExportStatus.FAILED, new Date(), 'Cancelled by user', id]
        );
        
        return true;
      } catch (error) {console.error('Error cancelling export job:', error);
        throw new ApolloError('Failed to cancel export job');
      }
    },

    createExportTemplate: async (_: any, { input }: { input: any }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      try {
        const templateId = uuidv4();
        const now = new Date();
        
        // Insert template
        const { rows } = await pgPool.query(
          `INSERT INTO export_templates (
            id, name, description, type, format, config, organization_id, 
            is_public, created_at, updated_at, created_by, updated_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
          [
            templateId,
            input.name,
            input.description || '',
            input.type,
            input.format,
            input.config,
            context.user.organizationId,
            input.isPublic !== undefined ? input.isPublic : false,
            now,
            now,
            context.user.id,
            context.user.id,
          ]
        );
        
        const template = rows[0];
        
        // Parse JSON config
        template.config = JSON.parse(template.config);
        
        return template;
      } catch (error) {
        console.error('Error creating export template:', error);
        throw new ApolloError('Failed to create export template');
      }
    },
    
    updateExportTemplate: async (_: any, { id, input }: { id: string, input: any }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      try {
        // Check if template exists and user has access to it
        const { rows: checkRows } = await pgPool.query(
          'SELECT * FROM export_templates WHERE id = $1 AND organization_id = $2',
          [id, context.user.organizationId]
        );
        
        if (checkRows.length === 0) {
          throw new ForbiddenError('Export template not found or not accessible');
        }
        
        // Build update query
        let updateQuery = 'UPDATE export_templates SET updated_at = $1, updated_by = $2';
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
        
        if (input.format !== undefined) {
          updateQuery += `, format = $${paramIndex++}`;
          params.push(input.format);
        }
        
        if (input.config !== undefined) {
          updateQuery += `, config = $${paramIndex++}`;
          params.push(input.config);
        }
        
        if (input.isPublic !== undefined) {
          updateQuery += `, is_public = $${paramIndex++}`;
          params.push(input.isPublic);
        }
        
        updateQuery += ` WHERE id = $${paramIndex} RETURNING *`;
        params.push(id);
        
        // Update template
        const { rows } = await pgPool.query(updateQuery, params);
        
        const template = rows[0];
        
        // Parse JSON config
        template.config = JSON.parse(template.config);
        
        return template;
      } catch (error) {
        console.error('Error updating export template:', error);
        throw new ApolloError('Failed to update export template');
      }
    },
    
    deleteExportTemplate: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      try {
        // Check if template exists and user has access to it
        const { rows } = await pgPool.query(
          'SELECT * FROM export_templates WHERE id = $1 AND organization_id = $2',
          [id, context.user.organizationId]
        );
        
        if (rows.length === 0) {
          throw new ForbiddenError('Export template not found or not accessible');
        }
        
        // Delete template
        await pgPool.query('DELETE FROM export_templates WHERE id = $1', [id]);
        
        return true;
      } catch (error) {
        console.error('Error deleting export template:', error);
        throw new ApolloError('Failed to delete export template');
      }
    },
    
    exportWithTemplate: async (_: any, 
      { templateId, sourceId }: { templateId: string, sourceId: string }, 
      context: any
    ) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      try {
        // Get template
        const { rows: templateRows } = await pgPool.query(
          `SELECT * FROM export_templates 
           WHERE id = $1 AND (organization_id = $2 OR is_public = TRUE)`,
          [templateId, context.user.organizationId]
        );
        
        if (templateRows.length === 0) {
          throw new Error('Export template not found or not accessible');
        }
        
        const template = templateRows[0];
        
        // Create new export job
        const jobId = uuidv4();
        
        const { rows } = await pgPool.query(
          `INSERT INTO export_jobs (
            id, user_id, organization_id, type, format, source_id, 
            config, status, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
          [
            jobId,
            context.user.id,
            context.user.organizationId,
            template.type,
            template.format,
            sourceId,
            template.config,
            ExportStatus.PENDING,
            new Date(),
          ]
        );
        
        const job = rows[0];
        
        // Parse JSON config
        job.config = JSON.parse(job.config);
        
        return job;
      } catch (error) {
        console.error('Error exporting with template:', error);
        throw new ApolloError('Failed to export with template: ' + (error instanceof Error ? error.message : String(error)));
      }
    },
  },
};