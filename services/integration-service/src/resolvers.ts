// services/integration-service/src/resolvers.ts

import { ApolloError, ForbiddenError, AuthenticationError } from 'apollo-server-express';
import { v4 as uuidv4 } from 'uuid';
import {
  DataSource,
  DataMapping,
  IntegrationJob,
  SyncSchedule,
  IntegrationType,
  DataDirection,
  AuthType,
  ConnectionStatus,
  ScheduleFrequency,
} from './types';
import { pgPool } from './db';
import { IntegrationFactory } from './integrations/integration-factory';

export const resolvers = {
  Query: {
    dataSource: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      try {
        // Get data source
        const { rows } = await pgPool.query(
          'SELECT * FROM data_sources WHERE id = $1 AND organization_id = $2',
          [id, context.user.organizationId]
        );
        
        if (rows.length === 0) {
          return null;
        }
        
        const dataSource = rows[0];
        
        // Get mappings
        const { rows: mappingsRows } = await pgPool.query(
          'SELECT * FROM data_mappings WHERE data_source_id = $1',
          [id]
        );
        
        dataSource.mappings = mappingsRows;
        dataSource.config = JSON.stringify(dataSource.config);
        if (dataSource.authConfig) {
          dataSource.authConfig = JSON.stringify(dataSource.authConfig);
        }
        
        return dataSource;
      } catch (error) {
        console.error('Error fetching data source:', error);
        throw new ApolloError('Failed to fetch data source');
      }
    },
    
    dataSources: async (_: any, { organizationId }: { organizationId: string }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      if (context.user.organizationId !== organizationId) {
        throw new ForbiddenError('Not authorized to access this organization');
      }
      
      try {
        const { rows } = await pgPool.query(
          'SELECT * FROM data_sources WHERE organization_id = $1 ORDER BY created_at DESC',
          [organizationId]
        );
        
        // For each data source, get its mappings
        for (const dataSource of rows) {
          const { rows: mappingsRows } = await pgPool.query(
            'SELECT * FROM data_mappings WHERE data_source_id = $1',
            [dataSource.id]
          );
          
          dataSource.mappings = mappingsRows;
          dataSource.config = JSON.stringify(dataSource.config);
          if (dataSource.authConfig) {
            dataSource.authConfig = JSON.stringify(dataSource.authConfig);
          }
        }
        
        return rows;
      } catch (error) {
        console.error('Error fetching data sources:', error);
        throw new ApolloError('Failed to fetch data sources');
      }
    },
    
    dataSourcesByType: async (
      _: any,
      { organizationId, type }: { organizationId: string; type: IntegrationType },
      context: any
    ) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      if (context.user.organizationId !== organizationId) {
        throw new ForbiddenError('Not authorized to access this organization');
      }
      
      try {
        const { rows } = await pgPool.query(
          'SELECT * FROM data_sources WHERE organization_id = $1 AND type = $2 ORDER BY created_at DESC',
          [organizationId, type]
        );
        
        // For each data source, get its mappings
        for (const dataSource of rows) {
          const { rows: mappingsRows } = await pgPool.query(
            'SELECT * FROM data_mappings WHERE data_source_id = $1',
            [dataSource.id]
          );
          
          dataSource.mappings = mappingsRows;
          dataSource.config = JSON.stringify(dataSource.config);
          if (dataSource.authConfig) {
            dataSource.authConfig = JSON.stringify(dataSource.authConfig);
          }
        }
        
        return rows;
      } catch (error) {
        console.error('Error fetching data sources by type:', error);
        throw new ApolloError('Failed to fetch data sources');
      }
    },
    
    integrationJob: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      try {
        const { rows } = await pgPool.query(
          `SELECT j.* 
           FROM integration_jobs j
           JOIN data_sources d ON j.data_source_id = d.id
           WHERE j.id = $1 AND d.organization_id = $2`,
          [id, context.user.organizationId]
        );
        
        return rows.length > 0 ? rows[0] : null;
      } catch (error) {
        console.error('Error fetching integration job:', error);
        throw new ApolloError('Failed to fetch integration job');
      }
    },
    
    integrationJobs: async (_: any, { dataSourceId }: { dataSourceId: string }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      try {
        // Check if data source belongs to user's organization
        const { rows: dsRows } = await pgPool.query(
          'SELECT * FROM data_sources WHERE id = $1 AND organization_id = $2',
          [dataSourceId, context.user.organizationId]
        );
        
        if (dsRows.length === 0) {
          throw new ForbiddenError('Not authorized to access this data source');
        }
        
        const { rows } = await pgPool.query(
          'SELECT * FROM integration_jobs WHERE data_source_id = $1 ORDER BY created_at DESC',
          [dataSourceId]
        );
        
        return rows;
      } catch (error) {
        console.error('Error fetching integration jobs:', error);
        throw new ApolloError('Failed to fetch integration jobs');
      }
    },
    
    syncSchedule: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      try {
        const { rows } = await pgPool.query(
          `SELECT s.* 
           FROM sync_schedules s
           JOIN data_sources d ON s.data_source_id = d.id
           WHERE s.id = $1 AND d.organization_id = $2`,
          [id, context.user.organizationId]
        );
        
        return rows.length > 0 ? rows[0] : null;
      } catch (error) {
        console.error('Error fetching sync schedule:', error);
        throw new ApolloError('Failed to fetch sync schedule');
      }
    },
    
    syncSchedules: async (_: any, { dataSourceId }: { dataSourceId: string }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      try {
        // Check if data source belongs to user's organization
        const { rows: dsRows } = await pgPool.query(
          'SELECT * FROM data_sources WHERE id = $1 AND organization_id = $2',
          [dataSourceId, context.user.organizationId]
        );
        
        if (dsRows.length === 0) {
          throw new ForbiddenError('Not authorized to access this data source');
        }
        
        const { rows } = await pgPool.query(
          'SELECT * FROM sync_schedules WHERE data_source_id = $1 ORDER BY created_at DESC',
          [dataSourceId]
        );
        
        return rows;
      } catch (error) {
        console.error('Error fetching sync schedules:', error);
        throw new ApolloError('Failed to fetch sync schedules');
      }
    },
  },
  
  Mutation: {
    createDataSource: async (_: any, { input }: { input: any }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      const client = await pgPool.connect();
      
      try {
        await client.query('BEGIN');
        
        const dataSourceId = uuidv4();
        const now = new Date();
        
        // Parse config and authConfig from strings to objects
        const config = JSON.parse(input.config);
        const authConfig = input.authConfig ? JSON.parse(input.authConfig) : null;
        
        // Insert data source
        const { rows } = await client.query(
          `INSERT INTO data_sources (
            id, name, organization_id, type, description, config, auth_config,
            auth_type, status, data_direction, created_at, updated_at, created_by, updated_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
          [
            dataSourceId,
            input.name,
            context.user.organizationId,
            input.type,
            input.description || '',
            config,
            authConfig,
            input.authType,
            ConnectionStatus.INACTIVE, // Default to inactive until tested
            input.dataDirection,
            now,
            now,
            context.user.id,
            context.user.id,
          ]
        );
        
        const dataSource = rows[0];
        
        // Insert mappings
        const mappings = [];
        
        for (const mapping of input.mappings) {
          const mappingId = uuidv4();
          
          const { rows: mappingRows } = await client.query(
            `INSERT INTO data_mappings (
              id, data_source_id, source_field, target_field, transform, data_type
            ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [
              mappingId,
              dataSourceId,
              mapping.sourceField,
              mapping.targetField,
              mapping.transform || null,
              mapping.dataType,
            ]
          );
          
          mappings.push(mappingRows[0]);
        }
        
        await client.query('COMMIT');
        
        // Add mappings to the result
        dataSource.mappings = mappings;
        dataSource.config = JSON.stringify(dataSource.config);
        if (dataSource.authConfig) {
          dataSource.authConfig = JSON.stringify(dataSource.authConfig);
        }
        
        return dataSource;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating data source:', error);
        throw new ApolloError('Failed to create data source');
      } finally {
        client.release();
      }
    },
    
    updateDataSource: async (_: any, { id, input }: { id: string; input: any }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      const client = await pgPool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Check if data source exists and belongs to user's organization
        const { rows: existingRows } = await client.query(
          'SELECT * FROM data_sources WHERE id = $1 AND organization_id = $2',
          [id, context.user.organizationId]
        );
        
        if (existingRows.length === 0) {
          throw new ForbiddenError('Not authorized to update this data source');
        }
        
        // Build update query
        let updateQuery = 'UPDATE data_sources SET updated_at = $1, updated_by = $2';
        const params: any[] = [new Date(), context.user.id];
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
          params.push(JSON.parse(input.config));
        }
        
        if (input.authConfig !== undefined) {
          updateQuery += `, auth_config = $${paramIndex++}`;
          params.push(input.authConfig ? JSON.parse(input.authConfig) : null);
        }
        
        if (input.authType !== undefined) {
          updateQuery += `, auth_type = $${paramIndex++}`;
          params.push(input.authType);
        }
        
        if (input.status !== undefined) {
          updateQuery += `, status = $${paramIndex++}`;
          params.push(input.status);
        }
        
        if (input.dataDirection !== undefined) {
          updateQuery += `, data_direction = $${paramIndex++}`;
          params.push(input.dataDirection);
        }
        
        updateQuery += ` WHERE id = $${paramIndex} RETURNING *`;
        params.push(id);
        
        const { rows } = await client.query(updateQuery, params);
        
        await client.query('COMMIT');
        
        // Get mappings
        const { rows: mappingsRows } = await pgPool.query(
          'SELECT * FROM data_mappings WHERE data_source_id = $1',
          [id]
        );
        
        const dataSource = rows[0];
        dataSource.mappings = mappingsRows;
        dataSource.config = JSON.stringify(dataSource.config);
        if (dataSource.authConfig) {
          dataSource.authConfig = JSON.stringify(dataSource.authConfig);
        }
        
        return dataSource;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating data source:', error);
        throw new ApolloError('Failed to update data source');
      } finally {
        client.release();
      }
    },
    
    deleteDataSource: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      const client = await pgPool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Check if data source exists and belongs to user's organization
        const { rows } = await client.query(
          'SELECT * FROM data_sources WHERE id = $1 AND organization_id = $2',
          [id, context.user.organizationId]
        );
        
        if (rows.length === 0) {
          throw new ForbiddenError('Not authorized to delete this data source');
        }
        
        // Delete related records
        await client.query('DELETE FROM data_mappings WHERE data_source_id = $1', [id]);
        await client.query('DELETE FROM sync_schedules WHERE data_source_id = $1', [id]);
        
        // Note: We're not deleting integration_jobs to keep history
        
        // Delete data source
        await client.query('DELETE FROM data_sources WHERE id = $1', [id]);
        
        await client.query('COMMIT');
        
        return true;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting data source:', error);
        throw new ApolloError('Failed to delete data source');
      } finally {
        client.release();
      }
    },
    
    updateMappings: async (_: any, { input }: { input: any }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      const { dataSourceId, mappings } = input;
      const client = await pgPool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Check if data source exists and belongs to user's organization
        const { rows } = await client.query(
          'SELECT * FROM data_sources WHERE id = $1 AND organization_id = $2',
          [dataSourceId, context.user.organizationId]
        );
        
        if (rows.length === 0) {
          throw new ForbiddenError('Not authorized to update mappings for this data source');
        }
        
        // Delete existing mappings
        await client.query('DELETE FROM data_mappings WHERE data_source_id = $1', [dataSourceId]);
        
        // Insert new mappings
        const newMappings = [];
        
        for (const mapping of mappings) {
          const mappingId = uuidv4();
          
          const { rows: mappingRows } = await client.query(
            `INSERT INTO data_mappings (
              id, data_source_id, source_field, target_field, transform, data_type
            ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [
              mappingId,
              dataSourceId,
              mapping.sourceField,
              mapping.targetField,
              mapping.transform || null,
              mapping.dataType,
            ]
          );
          
          newMappings.push(mappingRows[0]);
        }
        
        // Update data source updated_at
        await client.query(
          'UPDATE data_sources SET updated_at = $1, updated_by = $2 WHERE id = $3',
          [new Date(), context.user.id, dataSourceId]
        );
        
        await client.query('COMMIT');
        
        return newMappings;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating mappings:', error);
        throw new ApolloError('Failed to update mappings');
      } finally {
        client.release();
      }
    },
    
    testConnection: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      try {
        // Check if data source exists and belongs to user's organization
        const { rows } = await pgPool.query(
          'SELECT * FROM data_sources WHERE id = $1 AND organization_id = $2',
          [id, context.user.organizationId]
        );
        
        if (rows.length === 0) {
          throw new ForbiddenError('Not authorized to test this data source');
        }
        
        const dataSource = rows[0];
        
        // Placeholder for actual connection testing
        // In a real implementation, this would test the connection based on the data source type
        console.log(`Testing connection for data source ${dataSource.name}`);
        
        // Update status
        await pgPool.query(
          'UPDATE data_sources SET status = $1, updated_at = $2, updated_by = $3 WHERE id = $4',
          [ConnectionStatus.ACTIVE, new Date(), context.user.id, id]
        );
        
        return true;
      } catch (error) {
        console.error('Error testing connection:', error);
        
        // Update status to error
        await pgPool.query(
          'UPDATE data_sources SET status = $1, updated_at = $2, updated_by = $3 WHERE id = $4',
          [ConnectionStatus.ERROR, new Date(), context.user?.id || 'system', id]
        );
        
        throw new ApolloError('Failed to test connection');
      }
    },
    
    createSyncSchedule: async (_: any, { input }: { input: any }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      const { dataSourceId, frequency, customCron, isActive } = input;
      
      try {
        // Check if data source exists and belongs to user's organization
        const { rows: dsRows } = await pgPool.query(
          'SELECT * FROM data_sources WHERE id = $1 AND organization_id = $2',
          [dataSourceId, context.user.organizationId]
        );
        
        if (dsRows.length === 0) {
          throw new ForbiddenError('Not authorized to create schedule for this data source');
        }
        
        const scheduleId = uuidv4();
        const now = new Date();
        
        // Calculate next run time based on frequency
        let nextRunTime = new Date();
        
        switch (frequency) {
          case ScheduleFrequency.HOURLY:
            nextRunTime.setHours(nextRunTime.getHours() + 1);
            break;
          case ScheduleFrequency.DAILY:
            nextRunTime.setDate(nextRunTime.getDate() + 1);
            break;
          case ScheduleFrequency.WEEKLY:
            nextRunTime.setDate(nextRunTime.getDate() + 7);
            break;
          case ScheduleFrequency.MONTHLY:
            nextRunTime.setMonth(nextRunTime.getMonth() + 1);
            break;
          case ScheduleFrequency.CUSTOM:
            // For custom schedules, we'd use a cron parser library
            // For now, just set to tomorrow
            nextRunTime.setDate(nextRunTime.getDate() + 1);
            break;
          default:
            // MANUAL - no next run time
            nextRunTime = null;
        }
        
        const { rows } = await pgPool.query(
          `INSERT INTO sync_schedules (
            id, data_source_id, frequency, custom_cron, next_run_time,
            is_active, created_at, updated_at, created_by, updated_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
          [
            scheduleId,
            dataSourceId,
            frequency,
            customCron || null,
            nextRunTime,
            isActive,
            now,
            now,
            context.user.id,
            context.user.id,
          ]
        );
        
        return rows[0];
      } catch (error) {
        console.error('Error creating sync schedule:', error);
        throw new ApolloError('Failed to create sync schedule');
      }
    },
    
    updateSyncSchedule: async (_: any, { id, input }: { id: string; input: any }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      try {
        // Check if schedule exists and belongs to user's organization
        const { rows: scheduleRows } = await pgPool.query(
          `SELECT s.* 
           FROM sync_schedules s
           JOIN data_sources d ON s.data_source_id = d.id
           WHERE s.id = $1 AND d.organization_id = $2`,
          [id, context.user.organizationId]
        );
        
        if (scheduleRows.length === 0) {
          throw new ForbiddenError('Not authorized to update this schedule');
        }
        
        const schedule = scheduleRows[0];
        
        // Build update query
        let updateQuery = 'UPDATE sync_schedules SET updated_at = $1, updated_by = $2';
        const params: any[] = [new Date(), context.user.id];
        let paramIndex = 3;
        
        // Calculate next run time if frequency changed
        let nextRunTime = null;
        if (input.frequency !== undefined && input.frequency !== schedule.frequency) {
          nextRunTime = new Date();
          
          switch (input.frequency) {
            case ScheduleFrequency.HOURLY:
              nextRunTime.setHours(nextRunTime.getHours() + 1);
              break;
            case ScheduleFrequency.DAILY:
              nextRunTime.setDate(nextRunTime.getDate() + 1);
              break;
            case ScheduleFrequency.WEEKLY:
              nextRunTime.setDate(nextRunTime.getDate() + 7);
              break;
            case ScheduleFrequency.MONTHLY:
              nextRunTime.setMonth(nextRunTime.getMonth() + 1);
              break;
            case ScheduleFrequency.CUSTOM:
              // For custom schedules, we'd use a cron parser library
              // For now, just set to tomorrow
              nextRunTime.setDate(nextRunTime.getDate() + 1);
              break;
            default:
              // MANUAL - no next run time
              nextRunTime = null;
          }
          
          updateQuery += `, frequency = $${paramIndex++}`;
          params.push(input.frequency);
          
          updateQuery += `, next_run_time = $${paramIndex++}`;
          params.push(nextRunTime);
        }
        
        if (input.customCron !== undefined) {
          updateQuery += `, custom_cron = $${paramIndex++}`;
          params.push(input.customCron || null);
        }
        
        if (input.isActive !== undefined) {
          updateQuery += `, is_active = $${paramIndex++}`;
          params.push(input.isActive);
        }
        
        updateQuery += ` WHERE id = $${paramIndex} RETURNING *`;
        params.push(id);
        
        const { rows } = await pgPool.query(updateQuery, params);
        
        return rows[0];
      } catch (error) {
        console.error('Error updating sync schedule:', error);
        throw new ApolloError('Failed to update sync schedule');
      }
    },
    
    deleteSyncSchedule: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      try {
        // Check if schedule exists and belongs to user's organization
        const { rows: scheduleRows } = await pgPool.query(
          `SELECT s.* 
           FROM sync_schedules s
           JOIN data_sources d ON s.data_source_id = d.id
           WHERE s.id = $1 AND d.organization_id = $2`,
          [id, context.user.organizationId]
        );
        
        if (scheduleRows.length === 0) {
          throw new ForbiddenError('Not authorized to delete this schedule');
        }
        
        await pgPool.query('DELETE FROM sync_schedules WHERE id = $1', [id]);
        
        return true;
      } catch (error) {
        console.error('Error deleting sync schedule:', error);
        throw new ApolloError('Failed to delete sync schedule');
      }
    },
    
    importCSV: async (_: any, { input }: { input: any }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      try {
        // Check if data source exists and belongs to user's organization
        const { rows: dsRows } = await pgPool.query(
          'SELECT * FROM data_sources WHERE id = $1 AND organization_id = $2',
          [input.dataSourceId, context.user.organizationId]
        );
        
        if (dsRows.length === 0) {
          throw new ForbiddenError('Not authorized to use this data source');
        }
        
        // Create job record
        const jobId = uuidv4();
        
        await pgPool.query(
          `INSERT INTO integration_jobs (
            id, data_source_id, model_id, status, created_at, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [
            jobId,
            input.dataSourceId,
            input.modelId || null,
            'PENDING',
            new Date(),
            context.user.id,
          ]
        );
        
        // Create CSV integration with the provided config
        const csvConfig = {
          filePath: input.filePath,
          fileUrl: input.fileUrl,
          options: {
            hasHeader: input.hasHeader !== undefined ? input.hasHeader : true,
            delimiter: input.delimiter || ',',
            skipRows: input.skipRows || 0,
            maxRows: input.maxRows,
            encoding: input.encoding || 'utf-8',
          },
          modelId: input.modelId,
          targetEntity: input.targetEntity,
        };
        
        // Run the integration in the background
        // In a production system, this would be handled by a queue/worker
        const integration = await IntegrationFactory.createIntegration(
          input.dataSourceId,
          csvConfig
        );
        
        // Update job to running status
        await pgPool.query(
          'UPDATE integration_jobs SET status = $1, start_time = $2 WHERE id = $3',
          ['RUNNING', new Date(), jobId]
        );
        
        // Execute integration in background
        (async () => {
          try {
            await integration.execute();
          } catch (error) {
            console.error('Background CSV import error:', error);
            
            // Update job status to failed
            await pgPool.query(
              'UPDATE integration_jobs SET status = $1, end_time = $2, error_message = $3 WHERE id = $4',
              [
                'FAILED',
                new Date(),
                error instanceof Error ? error.message : String(error),
                jobId,
              ]
            );
          }
        })();
        
        // Return job record
        const { rows } = await pgPool.query(
          'SELECT * FROM integration_jobs WHERE id = $1',
          [jobId]
        );
        
        return rows[0];
      } catch (error) {
        console.error('Error starting CSV import:', error);
        throw new ApolloError('Failed to start CSV import');
      }
    },
    
    importExcel: async (_: any, { input }: { input: any }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      try {
        // Check if data source exists and belongs to user's organization
        const { rows: dsRows } = await pgPool.query(
          'SELECT * FROM data_sources WHERE id = $1 AND organization_id = $2',
          [input.dataSourceId, context.user.organizationId]
        );
        
        if (dsRows.length === 0) {
          throw new ForbiddenError('Not authorized to use this data source');
        }
        
        // Create job record
        const jobId = uuidv4();
        
        await pgPool.query(
          `INSERT INTO integration_jobs (
            id, data_source_id, model_id, status, created_at, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [
            jobId,
            input.dataSourceId,
            input.modelId || null,
            'PENDING',
            new Date(),
            context.user.id,
          ]
        );
        
        // Create Excel integration with the provided config
        const excelConfig = {
          filePath: input.filePath,
          fileUrl: input.fileUrl,
          options: {
            sheetName: input.sheetName,
            sheetIndex: input.sheetIndex,
            hasHeader: input.hasHeader !== undefined ? input.hasHeader : true,
            skipRows: input.skipRows || 0,
            maxRows: input.maxRows,
            range: input.range,
          },
          modelId: input.modelId,
          targetEntity: input.targetEntity,
        };
        
        // Run the integration in the background
        // In a production system, this would be handled by a queue/worker
        const integration = await IntegrationFactory.createIntegration(
          input.dataSourceId,
          excelConfig
        );
        
        // Update job to running status
        await pgPool.query(
          'UPDATE integration_jobs SET status = $1, start_time = $2 WHERE id = $3',
          ['RUNNING', new Date(), jobId]
        );
        
        // Execute integration in background
        (async () => {
          try {
            await integration.execute();
          } catch (error) {
            console.error('Background Excel import error:', error);
            
            // Update job status to failed
            await pgPool.query(
              'UPDATE integration_jobs SET status = $1, end_time = $2, error_message = $3 WHERE id = $4',
              [
                'FAILED',
                new Date(),
                error instanceof Error ? error.message : String(error),
                jobId,
              ]
            );
          }
        })();
        
        // Return job record
        const { rows } = await pgPool.query(
          'SELECT * FROM integration_jobs WHERE id = $1',
          [jobId]
        );
        
        return rows[0];
      } catch (error) {
        console.error('Error starting Excel import:', error);
        throw new ApolloError('Failed to start Excel import');
      }
    },
    
    triggerSync: async (_: any, { dataSourceId }: { dataSourceId: string }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      try {
        // Check if data source exists and belongs to user's organization
        const { rows: dsRows } = await pgPool.query(
          'SELECT * FROM data_sources WHERE id = $1 AND organization_id = $2',
          [dataSourceId, context.user.organizationId]
        );
        
        if (dsRows.length === 0) {
          throw new ForbiddenError('Not authorized to trigger sync for this data source');
        }
        
        const dataSource = dsRows[0];
        
        // Create job record
        const jobId = uuidv4();
        
        await pgPool.query(
          `INSERT INTO integration_jobs (
            id, data_source_id, status, created_at, created_by
          ) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [
            jobId,
            dataSourceId,
            'PENDING',
            new Date(),
            context.user.id,
          ]
        );
        
        // In a real implementation, we would create the appropriate integration 
        // and trigger it based on the data source configuration
        // For now, we'll just mark the job as completed
        
        // Update job to completed status
        await pgPool.query(
          'UPDATE integration_jobs SET status = $1, start_time = $2, end_time = $3 WHERE id = $4',
          ['COMPLETED', new Date(), new Date(), jobId]
        );
        
        // Return job record
        const { rows } = await pgPool.query(
          'SELECT * FROM integration_jobs WHERE id = $1',
          [jobId]
        );
        
        return rows[0];
      } catch (error) {
        console.error('Error triggering sync:', error);
        throw new ApolloError('Failed to trigger sync');
      }
    },
    
    cancelJob: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      try {
        // Check if job exists and belongs to user's organization
        const { rows: jobRows } = await pgPool.query(
          `SELECT j.* 
           FROM integration_jobs j
           JOIN data_sources d ON j.data_source_id = d.id
           WHERE j.id = $1 AND d.organization_id = $2
           AND j.status IN ('PENDING', 'RUNNING')`,
          [id, context.user.organizationId]
        );
        
        if (jobRows.length === 0) {
          throw new ForbiddenError('Not authorized to cancel this job or job is not cancellable');
        }
        
        // Update job status to canceled
        await pgPool.query(
          'UPDATE integration_jobs SET status = $1, end_time = $2 WHERE id = $3',
          ['FAILED', new Date(), id]
        );
        
        // In a real implementation, we would also need to signal the worker to stop processing
        
        return true;
      } catch (error) {
        console.error('Error canceling job:', error);
        throw new ApolloError('Failed to cancel job');
      }
    },
  },
};