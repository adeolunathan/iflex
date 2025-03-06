// services/model-service/src/resolvers.ts

import { v4 as uuidv4 } from 'uuid';
import { pgPool, redisClient } from './db';
import { FinancialModel, ModelComponent, TimeSeriesData } from './types';

export const resolvers = {
  Query: {
    model: async (_: any, { id }: { id: string }) => {
      try {
        // First try to get from cache
        const cachedModel = await redisClient.get(`model:${id}`);
        if (cachedModel) {
          return JSON.parse(cachedModel);
        }

        // Get from database
        const { rows } = await pgPool.query(
          'SELECT * FROM financial_models WHERE id = $1',
          [id]
        );
        
        if (rows.length === 0) {
          return null;
        }
        
        const model = rows[0];
        
        // Get components
        const { rows: componentRows } = await pgPool.query(
          'SELECT * FROM model_components WHERE model_id = $1',
          [id]
        );
        
        model.components = componentRows;
        
        // Cache the result
        await redisClient.set(`model:${id}`, JSON.stringify(model), {
          EX: 300 // Cache for 5 minutes
        });
        
        return model;
      } catch (error) {
        console.error('Error fetching model:', error);
        throw new Error('Failed to fetch model');
      }
    },
    
    models: async (_: any, { organizationId }: { organizationId: string }) => {
      try {
        const { rows } = await pgPool.query(
          'SELECT * FROM financial_models WHERE organization_id = $1 ORDER BY updated_at DESC',
          [organizationId]
        );
        
        return rows;
      } catch (error) {
        console.error('Error fetching models:', error);
        throw new Error('Failed to fetch models');
      }
    },
    
    component: async (_: any, { id }: { id: string }) => {
      try {
        const { rows } = await pgPool.query(
          'SELECT * FROM model_components WHERE id = $1',
          [id]
        );
        
        return rows.length > 0 ? rows[0] : null;
      } catch (error) {
        console.error('Error fetching component:', error);
        throw new Error('Failed to fetch component');
      }
    },
    
    timeSeriesData: async (_: any, { 
      componentId, 
      scenarioId, 
      versionId 
    }: { 
      componentId: string, 
      scenarioId?: string, 
      versionId?: string 
    }) => {
      try {
        let query = 'SELECT * FROM time_series_data WHERE component_id = $1';
        const params = [componentId];
        
        if (scenarioId) {
          query += ' AND scenario_id = $2';
          params.push(scenarioId);
        }
        
        if (versionId) {
          query += ` AND version_id = $${params.length + 1}`;
          params.push(versionId);
        }
        
        const { rows } = await pgPool.query(query, params);
        return rows;
      } catch (error) {
        console.error('Error fetching time series data:', error);
        throw new Error('Failed to fetch time series data');
      }
    },
  },
  
  Mutation: {
    createModel: async (_: any, { input }: { input: any }) => {
      const client = await pgPool.connect();
      try {
        await client.query('BEGIN');
        
        const modelId = uuidv4();
        const now = new Date().toISOString();
        
        // Calculate period count based on start and end dates
        const startDate = new Date(input.startDate);
        const endDate = new Date(input.endDate);
        let periodCount = 0;
        
        switch (input.timePeriod) {
          case 'DAYS':
            periodCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            break;
          case 'WEEKS':
            periodCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
            break;
          case 'MONTHS':
            periodCount = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                          (endDate.getMonth() - startDate.getMonth()) + 1;
            break;
          case 'QUARTERS':
            periodCount = Math.ceil(((endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                          (endDate.getMonth() - startDate.getMonth()) + 1) / 3);
            break;
          case 'YEARS':
            periodCount = endDate.getFullYear() - startDate.getFullYear() + 1;
            break;
        }
        
        const { rows } = await client.query(
          `INSERT INTO financial_models (
            id, name, description, start_date, end_date, time_period, period_count,
            organization_id, created_at, updated_at, created_by, updated_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
          [
            modelId,
            input.name,
            input.description || '',
            input.startDate,
            input.endDate,
            input.timePeriod,
            periodCount,
            input.organizationId,
            now,
            now,
            'system', // This should be the authenticated user's ID
            'system', // This should be the authenticated user's ID
          ]
        );
        
        await client.query('COMMIT');
        
        const model = rows[0];
        model.components = [];
        
        return model;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating model:', error);
        throw new Error('Failed to create model');
      } finally {
        client.release();
      }
    },
    
    updateModel: async (_: any, { id, input }: { id: string, input: any }) => {
      const client = await pgPool.connect();
      try {
        await client.query('BEGIN');
        
        const now = new Date().toISOString();
        
        // Calculate period count based on start and end dates
        const startDate = new Date(input.startDate);
        const endDate = new Date(input.endDate);
        let periodCount = 0;
        
        switch (input.timePeriod) {
          case 'DAYS':
            periodCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            break;
          case 'WEEKS':
            periodCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
            break;
          case 'MONTHS':
            periodCount = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                          (endDate.getMonth() - startDate.getMonth()) + 1;
            break;
          case 'QUARTERS':
            periodCount = Math.ceil(((endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                          (endDate.getMonth() - startDate.getMonth()) + 1) / 3);
            break;
          case 'YEARS':
            periodCount = endDate.getFullYear() - startDate.getFullYear() + 1;
            break;
        }
        
        const { rows } = await client.query(
          `UPDATE financial_models SET
            name = $1,
            description = $2,
            start_date = $3,
            end_date = $4,
            time_period = $5,
            period_count = $6,
            updated_at = $7,
            updated_by = $8
          WHERE id = $9 RETURNING *`,
          [
            input.name,
            input.description || '',
            input.startDate,
            input.endDate,
            input.timePeriod,
            periodCount,
            now,
            'system', // This should be the authenticated user's ID
            id,
          ]
        );
        
        if (rows.length === 0) {
          throw new Error('Model not found');
        }
        
        await client.query('COMMIT');
        
        // Invalidate cache
        await redisClient.del(`model:${id}`);
        
        // Get components
        const { rows: componentRows } = await pgPool.query(
          'SELECT * FROM model_components WHERE model_id = $1',
          [id]
        );
        
        const model = rows[0];
        model.components = componentRows;
        
        return model;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating model:', error);
        throw new Error('Failed to update model');
      } finally {
        client.release();
      }
    },
    
    deleteModel: async (_: any, { id }: { id: string }) => {
      const client = await pgPool.connect();
      try {
        await client.query('BEGIN');
        
        // Delete time series data for all components in the model
        await client.query(
          `DELETE FROM time_series_data 
           WHERE component_id IN (
             SELECT id FROM model_components WHERE model_id = $1
           )`,
          [id]
        );
        
        // Delete components
        await client.query(
          'DELETE FROM model_components WHERE model_id = $1',
          [id]
        );
        
        // Delete model
        const { rowCount } = await client.query(
          'DELETE FROM financial_models WHERE id = $1',
          [id]
        );
        
        await client.query('COMMIT');
        
        // Invalidate cache
        await redisClient.del(`model:${id}`);
        
        return rowCount > 0;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting model:', error);
        throw new Error('Failed to delete model');
      } finally {
        client.release();
      }
    },
    
    addComponent: async (_: any, { modelId, input }: { modelId: string, input: any }) => {
      const client = await pgPool.connect();
      try {
        await client.query('BEGIN');
        
        const componentId = uuidv4();
        const now = new Date().toISOString();
        
        const { rows } = await client.query(
          `INSERT INTO model_components (
            id, model_id, name, description, type, data_type, formula, references,
            position_x, position_y, created_at, updated_at, created_by, updated_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
          [
            componentId,
            modelId,
            input.name,
            input.description || '',
            input.type,
            input.dataType,
            input.formula || null,
            input.references || [],
            input.position.x,
            input.position.y,
            now,
            now,
            'system', // This should be the authenticated user's ID
            'system', // This should be the authenticated user's ID
          ]
        );
        
        // Update model's updated_at
        await client.query(
          'UPDATE financial_models SET updated_at = $1 WHERE id = $2',
          [now, modelId]
        );
        
        await client.query('COMMIT');
        
        // Invalidate cache
        await redisClient.del(`model:${modelId}`);
        
        return rows[0];
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error adding component:', error);
        throw new Error('Failed to add component');
      } finally {
        client.release();
      }
    },
    
    updateComponent: async (_: any, { id, input }: { id: string, input: any }) => {
      const client = await pgPool.connect();
      try {
        await client.query('BEGIN');
        
        const now = new Date().toISOString();
        
        // First, get the component to find its model_id
        const { rows: componentRows } = await client.query(
          'SELECT model_id FROM model_components WHERE id = $1',
          [id]
        );
        
        if (componentRows.length === 0) {
          throw new Error('Component not found');
        }
        
        const modelId = componentRows[0].model_id;
        
        const { rows } = await client.query(
          `UPDATE model_components SET
            name = $1,
            description = $2,
            type = $3,
            data_type = $4,
            formula = $5,
            references = $6,
            position_x = $7,
            position_y = $8,
            updated_at = $9,
            updated_by = $10
          WHERE id = $11 RETURNING *`,
          [
            input.name,
            input.description || '',
            input.type,
            input.dataType,
            input.formula || null,
            input.references || [],
            input.position.x,
            input.position.y,
            now,
            'system', // This should be the authenticated user's ID
            id,
          ]
        );
        
        // Update model's updated_at
        await client.query(
          'UPDATE financial_models SET updated_at = $1 WHERE id = $2',
          [now, modelId]
        );
        
        await client.query('COMMIT');
        
        // Invalidate cache
        await redisClient.del(`model:${modelId}`);
        
        return rows[0];
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating component:', error);
        throw new Error('Failed to update component');
      } finally {
        client.release();
      }
    },
    
    deleteComponent: async (_: any, { id }: { id: string }) => {
      const client = await pgPool.connect();
      try {
        await client.query('BEGIN');
        
        // First, get the component to find its model_id
        const { rows: componentRows } = await client.query(
          'SELECT model_id FROM model_components WHERE id = $1',
          [id]
        );
        
        if (componentRows.length === 0) {
          return false;
        }
        
        const modelId = componentRows[0].model_id;
        const now = new Date().toISOString();
        
        // Delete time series data
        await client.query(
          'DELETE FROM time_series_data WHERE component_id = $1',
          [id]
        );
        
        // Delete component
        const { rowCount } = await client.query(
          'DELETE FROM model_components WHERE id = $1',
          [id]
        );
        
        // Update model's updated_at
        await client.query(
          'UPDATE financial_models SET updated_at = $1 WHERE id = $2',
          [now, modelId]
        );
        
        await client.query('COMMIT');
        
        // Invalidate cache
        await redisClient.del(`model:${modelId}`);
        
        return rowCount > 0;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting component:', error);
        throw new Error('Failed to delete component');
      } finally {
        client.release();
      }
    },
    
    addTimeSeriesData: async (_: any, { input }: { input: any[] }) => {
      const client = await pgPool.connect();
      try {
        await client.query('BEGIN');
        
        // Group by component_id to find all affected models
        const componentIds = [...new Set(input.map(item => item.componentId))];
        
        // Get the model_ids for all affected components
        const { rows: componentRows } = await client.query(
          'SELECT DISTINCT model_id FROM model_components WHERE id = ANY($1)',
          [componentIds]
        );
        
        const modelIds = componentRows.map(row => row.model_id);
        const now = new Date().toISOString();
        
        // Insert all time series data
        for (const item of input) {
          await client.query(
            `INSERT INTO time_series_data (
              component_id, period, value, scenario_id, version_id
            ) VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (component_id, period, scenario_id, version_id)
            DO UPDATE SET value = $3`,
            [
              item.componentId,
              item.period,
              item.value,
              item.scenarioId || 'default',
              item.versionId || 'default',
            ]
          );
        }
        
        // Update all affected models' updated_at
        for (const modelId of modelIds) {
          await client.query(
            'UPDATE financial_models SET updated_at = $1 WHERE id = $2',
            [now, modelId]
          );
          
          // Invalidate cache
          await redisClient.del(`model:${modelId}`);
        }
        
        await client.query('COMMIT');
        
        return true;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error adding time series data:', error);
        throw new Error('Failed to add time series data');
      } finally {
        client.release();
      }
    },
    
    updateTimeSeriesData: async (_: any, { input }: { input: any[] }) => {
      // This is functionally the same as addTimeSeriesData due to the ON CONFLICT DO UPDATE
      return resolvers.Mutation.addTimeSeriesData(_, { input });
    },
    
    deleteTimeSeriesData: async (_: any, { 
      componentId, 
      periods, 
      scenarioId, 
      versionId 
    }: { 
      componentId: string, 
      periods: string[], 
      scenarioId?: string, 
      versionId?: string 
    }) => {
      const client = await pgPool.connect();
      try {
        await client.query('BEGIN');
        
        // Get the model_id for the component
        const { rows: componentRows } = await client.query(
          'SELECT model_id FROM model_components WHERE id = $1',
          [componentId]
        );
        
        if (componentRows.length === 0) {
          throw new Error('Component not found');
        }
        
        const modelId = componentRows[0].model_id;
        const now = new Date().toISOString();
        
        let query = 'DELETE FROM time_series_data WHERE component_id = $1 AND period = ANY($2)';
        const params = [componentId, periods];
        
        if (scenarioId) {
          query += ' AND scenario_id = $3';
          params.push(scenarioId);
        } else {
          query += ' AND scenario_id = $3';
          params.push('default');
        }
        
        if (versionId) {
          query += ` AND version_id = $${params.length + 1}`;
          params.push(versionId);
        } else {
          query += ` AND version_id = $${params.length + 1}`;
          params.push('default');
        }
        
        await client.query(query, params);
        
        // Update model's updated_at
        await client.query(
          'UPDATE financial_models SET updated_at = $1 WHERE id = $2',
          [now, modelId]
        );
        
        await client.query('COMMIT');
        
        // Invalidate cache
        await redisClient.del(`model:${modelId}`);
        
        return true;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting time series data:', error);
        throw new Error('Failed to delete time series data');
      } finally {
        client.release();
      }
    },
  },
};