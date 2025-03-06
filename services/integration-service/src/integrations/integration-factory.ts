// services/integration-service/src/integrations/integration-factory.ts

import { DataSource, DataMapping, IntegrationType } from '../types';
import { BaseIntegration } from './base-integration';
import { CSVIntegration, CSVIntegrationConfig } from './csv-integration';
import { ExcelIntegration, ExcelIntegrationConfig } from './excel-integration';
import { pgPool } from '../db';

export class IntegrationFactory {
  static async createIntegration(
    dataSourceId: string,
    config: Record<string, any>
  ): Promise<BaseIntegration> {
    // Get data source details from database
    const { rows } = await pgPool.query(
      'SELECT * FROM data_sources WHERE id = $1',
      [dataSourceId]
    );
    
    if (rows.length === 0) {
      throw new Error(`Data source with id ${dataSourceId} not found`);
    }
    
    const dataSource: DataSource = rows[0];
    
    // Get mappings
    const { rows: mappingRows } = await pgPool.query(
      'SELECT * FROM data_mappings WHERE data_source_id = $1',
      [dataSourceId]
    );
    
    const mappings: DataMapping[] = mappingRows;
    
    // Create appropriate integration based on type
    switch (dataSource.type) {
      case IntegrationType.CSV:
        return new CSVIntegration(
          dataSourceId,
          mappings,
          config as CSVIntegrationConfig
        );
        
      case IntegrationType.EXCEL:
        return new ExcelIntegration(
          dataSourceId,
          mappings,
          config as ExcelIntegrationConfig
        );
        
      default:
        throw new Error(`Integration type ${dataSource.type} not implemented`);
    }
  }
}