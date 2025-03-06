// services/analytics-service/src/utils/model-service.ts

import fetch from 'node-fetch';
import { config } from '../config';

export interface ComponentData {
  id: string;
  name: string;
  description?: string;
  type: string;
  dataType: string;
  formula?: string;
  references?: string[];
}

export interface ModelData {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  timePeriod: string;
  periodCount: number;
  components: ComponentData[];
}

export interface TimeSeriesData {
  componentId: string;
  period: string;
  value: string;
  scenarioId?: string;
  versionId?: string;
}

export async function getModel(id: string, token: string): Promise<ModelData | null> {
  try {
    const response = await fetch(config.modelServiceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: `
          query GetModel($id: ID!) {
            model(id: $id) {
              id
              name
              description
              startDate
              endDate
              timePeriod
              periodCount
              components {
                id
                name
                description
                type
                dataType
                formula
                references
              }
            }
          }
        `,
        variables: { id },
      }),
    });
    
    const data = await response.json();
    
    if (data.errors) {
      console.error('Error fetching model:', data.errors);
      return null;
    }
    
    return data.data.model;
  } catch (error) {
    console.error('Error fetching model:', error);
    return null;
  }
}

export async function getTimeSeriesData(
  componentIds: string[],
  scenarioId: string | null = null,
  versionId: string | null = null,
  token: string
): Promise<TimeSeriesData[]> {
  try {
    const response = await fetch(config.modelServiceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: `
          query GetTimeSeriesData($componentIds: [ID!]!, $scenarioId: ID, $versionId: ID) {
            timeSeriesData(
              componentIds: $componentIds,
              scenarioId: $scenarioId,
              versionId: $versionId
            ) {
              componentId
              period
              value
              scenarioId
              versionId
            }
          }
        `,
        variables: {
          componentIds,
          scenarioId,
          versionId,
        },
      }),
    });
    
    const data = await response.json();
    
    if (data.errors) {
      console.error('Error fetching time series data:', data.errors);
      return [];
    }
    
    return data.data.timeSeriesData;
  } catch (error) {
    console.error('Error fetching time series data:', error);
    return [];
  }
}
