// services/collaboration-service/src/utils/model.ts

import fetch from 'node-fetch';
import { config } from '../config';
import { Operation, OperationType } from '../types';

// Call model service to apply an operation
export async function applyOperation(operation: Operation, token: string): Promise<boolean> {
  try {
    const { type, modelId, componentId, data } = operation;
    
    let query = '';
    let variables = {};
    
    switch (type) {
      case OperationType.CREATE_COMPONENT:
        query = `
          mutation AddComponent($modelId: ID!, $input: ModelComponentInput!) {
            addComponent(modelId: $modelId, input: $input) {
              id
            }
          }
        `;
        variables = {
          modelId,
          input: {
            name: data.name,
            description: data.description || '',
            type: data.type,
            dataType: data.dataType,
            formula: data.formula || '',
            references: data.references || [],
            position: data.position,
          },
        };
        break;
        
      case OperationType.UPDATE_COMPONENT:
        query = `
          mutation UpdateComponent($id: ID!, $input: ModelComponentInput!) {
            updateComponent(id: $id, input: $input) {
              id
            }
          }
        `;
        variables = {
          id: componentId,
          input: {
            name: data.name,
            description: data.description || '',
            type: data.type,
            dataType: data.dataType,
            formula: data.formula || '',
            references: data.references || [],
            position: data.position,
          },
        };
        break;
        
      case OperationType.DELETE_COMPONENT:
        query = `
          mutation DeleteComponent($id: ID!) {
            deleteComponent(id: $id)
          }
        `;
        variables = {
          id: componentId,
        };
        break;
        
      case OperationType.UPDATE_MODEL_METADATA:
        query = `
          mutation UpdateModel($id: ID!, $input: FinancialModelInput!) {
            updateModel(id: $id, input: $input) {
              id
            }
          }
        `;
        variables = {
          id: modelId,
          input: {
            name: data.name,
            description: data.description || '',
            startDate: data.startDate,
            endDate: data.endDate,
            timePeriod: data.timePeriod,
            organizationId: data.organizationId,
          },
        };
        break;
        
      case OperationType.UPDATE_VALUES:
        query = `
          mutation AddTimeSeriesData($input: [TimeSeriesDataInput!]!) {
            addTimeSeriesData(input: $input)
          }
        `;
        variables = {
          input: data.values,
        };
        break;
        
      default:
        console.error('Unknown operation type:', type);
        return false;
    }
    
    const response = await fetch(config.modelServiceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });
    
    const responseData = await response.json();
    
    if (responseData.errors) {
      console.error('Error applying operation:', responseData.errors);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error applying operation:', error);
    return false;
  }
}