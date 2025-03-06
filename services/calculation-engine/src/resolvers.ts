// services/calculation-engine/src/resolvers.ts

import { DAG } from './dag';
import { CalculationContext, ModelComponent, Period } from './types';
import { evaluateFormula } from './formula';

export const resolvers = {
  Query: {
    healthCheck: () => 'Calculation Engine is healthy',
  },

  Mutation: {
    calculateModel: async (_: any, { 
      modelId,
      scenarioId = 'default',
      versionId = 'default',
      components,
      periods,
      initialValues = [],
    }: {
      modelId: string,
      scenarioId: string,
      versionId: string,
      components: any[],
      periods: any[],
      initialValues?: any[],
    }) => {
      const startTime = Date.now();
      
      try {
        // Create calculation context
        const context: CalculationContext = {
          modelId,
          scenarioId,
          versionId,
          components: {},
          periods: periods,
        };
        
        // Add components to context
        for (const component of components) {
          context.components[component.id] = component;
        }
        
        // Create DAG
        const dag = new DAG(context);
        
        // Set initial values
        for (const { componentId, periodId, value } of initialValues) {
          const node = dag.getNode(componentId);
          if (node) {
            node.values[periodId] = value;
          }
        }
        
        // Calculate
        const results = dag.calculate();
        
        const endTime = Date.now();
        
        return {
          results,
          executionTime: (endTime - startTime) / 1000, // in seconds
        };
      } catch (error) {
        console.error('Calculation error:', error);
        throw error;
      }
    },
    
    updateCalculation: async (_: any, { 
      modelId,
      scenarioId = 'default',
      versionId = 'default',
      components,
      periods,
      updatedValues,
    }: {
      modelId: string,
      scenarioId: string,
      versionId: string,
      components: any[],
      periods: any[],
      updatedValues: any[],
    }) => {
      const startTime = Date.now();
      
      try {
        // Create calculation context
        const context: CalculationContext = {
          modelId,
          scenarioId,
          versionId,
          components: {},
          periods: periods,
        };
        
        // Add components to context
        for (const component of components) {
          context.components[component.id] = component;
        }
        
        // Create DAG
        const dag = new DAG(context);
        
        // Set initial values for all components
        // This would typically come from the database in a real implementation
        // For this example, we're assuming all values are 0 unless specified
        
        // Set updated values and recalculate
        let results: Array<{ componentId: string; periodId: string; value: any; error?: string }> = [];
        
        for (const { componentId, periodId, value } of updatedValues) {
          const updateResults = dag.updateInput(componentId, periodId, value);
          results = [...results, ...updateResults];
        }
        
        const endTime = Date.now();
        
        return {
          results,
          executionTime: (endTime - startTime) / 1000, // in seconds
        };
      } catch (error) {
        console.error('Calculation error:', error);
        throw error;
      }
    },
    
    validateFormula: async (_: any, { formula }: { formula: string }) => {
      try {
        // Create a dummy context to test the formula
        const context: CalculationContext = {
          modelId: 'test',
          scenarioId: 'test',
          versionId: 'test',
          components: {},
          periods: [{
            id: 'test',
            label: 'Test',
            startDate: new Date(),
            endDate: new Date(),
          }],
        };
        
        // Try to evaluate the formula with dummy values
        evaluateFormula(formula, {}, context.periods[0], context);
        
        return true;
      } catch (error) {
        console.error('Formula validation error:', error);
        return false;
      }
    },
  },
};