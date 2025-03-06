// services/calculation-engine/src/formula/index.ts

import { Period, CalculationContext } from '../types';

// Define a type for our formula function
type FormulaFunction = (values: Record<string, any>, period: Period, context: CalculationContext) => any;

// Registry for formula functions
const formulaRegistry: Record<string, FormulaFunction> = {};

// Register built-in formula functions
formulaRegistry['SUM'] = (values) => {
  return Object.values(values).reduce((sum: number, value) => sum + (Number(value) || 0), 0);
};

formulaRegistry['AVERAGE'] = (values) => {
  const numbers = Object.values(values).filter(v => typeof v === 'number' || !isNaN(Number(v)));
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum: number, value) => sum + Number(value), 0) / numbers.length;
};

formulaRegistry['MAX'] = (values) => {
  const numbers = Object.values(values).filter(v => typeof v === 'number' || !isNaN(Number(v)));
  if (numbers.length === 0) return 0;
  return Math.max(...numbers.map(v => Number(v)));
};

formulaRegistry['MIN'] = (values) => {
  const numbers = Object.values(values).filter(v => typeof v === 'number' || !isNaN(Number(v)));
  if (numbers.length === 0) return 0;
  return Math.min(...numbers.map(v => Number(v)));
};

formulaRegistry['IF'] = (values, period, context) => {
  const condition = values['condition'];
  const trueValue = values['true'];
  const falseValue = values['false'];
  
  return condition ? trueValue : falseValue;
};

// Simple formula evaluator (this would be much more complex in a real implementation)
export function evaluateFormula(formula: string, values: Record<string, any>, period: Period, context: CalculationContext): any {
  // Check if it's a simple formula function
  const funcMatch = formula.match(/^([A-Z]+)\((.+)\)$/);
  if (funcMatch) {
    const funcName = funcMatch[1];
    const funcArgs = funcMatch[2].split(',').map(arg => arg.trim());
    
    if (formulaRegistry[funcName]) {
      const funcValues: Record<string, any> = {};
      for (const arg of funcArgs) {
        if (values[arg] !== undefined) {
          funcValues[arg] = values[arg];
        } else {
          // Try to parse as number
          const num = Number(arg);
          if (!isNaN(num)) {
            funcValues[arg] = num;
          } else {
            // Try to parse as reference to component value
            const refMatch = arg.match(/^([a-zA-Z0-9-]+)(?:\.([a-zA-Z0-9-]+))?$/);
            if (refMatch) {
              const componentId = refMatch[1];
              const propertyName = refMatch[2] || 'value';
              
              if (values[componentId] !== undefined) {
                funcValues[arg] = values[componentId];
              } else {
                throw new Error(`Reference not found: ${arg}`);
              }
            } else {
              // Assume it's a string literal
              funcValues[arg] = arg;
            }
          }
        }
      }
      
      return formulaRegistry[funcName](funcValues, period, context);
    }
  }
  
  // Handle simple arithmetic expressions
  try {
    // Replace component references with their values
    let evaluatableFormula = formula;
    
    // Replace references with their values
    for (const [id, value] of Object.entries(values)) {
      const regex = new RegExp(`\\b${id}\\b`, 'g');
      evaluatableFormula = evaluatableFormula.replace(regex, String(value));
    }
    
    // Use a safer alternative to eval in a real implementation
    // For demonstration purposes, we're using Function constructor
    // eslint-disable-next-line no-new-func
    return Function(`'use strict'; return (${evaluatableFormula})`)();
  } catch (error) {
    throw new Error(`Failed to evaluate formula: ${formula}. Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}
