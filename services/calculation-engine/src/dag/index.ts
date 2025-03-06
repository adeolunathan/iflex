// services/calculation-engine/src/dag/index.ts

import { CalculationNode, CalculationContext, CalculationResult } from '../types';
import { evaluateFormula } from '../formula';

export class DAG {
  private nodes: Map<string, CalculationNode> = new Map();
  private context: CalculationContext;
  
  constructor(context: CalculationContext) {
    this.context = context;
    this.buildGraph();
  }
  
  private buildGraph() {
    // Create nodes for each component
    for (const [componentId, component] of Object.entries(this.context.components)) {
      const dependencies = component.references || [];
      
      const node: CalculationNode = {
        id: componentId,
        dependencies,
        formula: component.formula,
        calculated: component.type === 'INPUT', // Input nodes are already calculated
        values: {},
      };
      
      this.nodes.set(componentId, node);
    }
  }
  
  public getNode(id: string): CalculationNode | undefined {
    return this.nodes.get(id);
  }
  
  public getDependents(id: string): string[] {
    const dependents: string[] = [];
    
    for (const [nodeId, node] of this.nodes.entries()) {
      if (node.dependencies.includes(id)) {
        dependents.push(nodeId);
      }
    }
    
    return dependents;
  }
  
  public calculate(): CalculationResult[] {
    const results: CalculationResult[] = [];
    const nodesToCalculate = Array.from(this.nodes.values())
      .filter(node => !node.calculated);
    
    // Keep calculating until all nodes are calculated
    while (nodesToCalculate.length > 0) {
      const initialLength = nodesToCalculate.length;
      
      // Find nodes whose dependencies are all calculated
      const calculableNodes = nodesToCalculate.filter(node => 
        node.dependencies.every(depId => {
          const depNode = this.nodes.get(depId);
          return depNode && depNode.calculated;
        })
      );
      
      if (calculableNodes.length === 0 && nodesToCalculate.length > 0) {
        // We have a circular dependency
        throw new Error('Circular dependency detected in calculation graph');
      }
      
      // Calculate each calculable node
      for (const node of calculableNodes) {
        this.calculateNode(node, results);
        
        // Remove from the list of nodes to calculate
        const index = nodesToCalculate.findIndex(n => n.id === node.id);
        if (index !== -1) {
          nodesToCalculate.splice(index, 1);
        }
      }
      
      // If we didn't calculate any nodes in this iteration, we're stuck
      if (initialLength === nodesToCalculate.length) {
        throw new Error('Unable to resolve dependencies for calculation');
      }
    }
    
    return results;
  }
  
  private calculateNode(node: CalculationNode, results: CalculationResult[]) {
    const component = this.context.components[node.id];
    
    if (!component) {
      throw new Error(`Component not found: ${node.id}`);
    }
    
    if (component.type === 'INPUT') {
      // Input nodes are already calculated
      node.calculated = true;
      return;
    }
    
    // For each period, calculate the value
    for (const period of this.context.periods) {
      try {
        let value: any;
        
        if (component.type === 'FORMULA' && component.formula) {
          // Get values of dependencies for this period
          const dependencyValues: Record<string, any> = {};
          for (const depId of node.dependencies) {
            const depNode = this.nodes.get(depId);
            if (!depNode) {
              throw new Error(`Dependency not found: ${depId}`);
            }
            
            dependencyValues[depId] = depNode.values[period.id];
          }
          
          // Evaluate the formula
          value = evaluateFormula(component.formula, dependencyValues, period, this.context);
        } else if (component.type === 'REFERENCE' && node.dependencies.length === 1) {
          // Reference nodes just pass through their dependency's value
          const depId = node.dependencies[0];
          const depNode = this.nodes.get(depId);
          if (!depNode) {
            throw new Error(`Dependency not found: ${depId}`);
          }
          
          value = depNode.values[period.id];
        } else if (component.type === 'AGGREGATION' && component.formula) {
          // Aggregation nodes need to consider values across multiple periods
          // This would be a more complex implementation
          // For simplicity, we'll just use the formula evaluator
          const dependencyValues: Record<string, any> = {};
          for (const depId of node.dependencies) {
            const depNode = this.nodes.get(depId);
            if (!depNode) {
              throw new Error(`Dependency not found: ${depId}`);
            }
            
            dependencyValues[depId] = depNode.values[period.id];
          }
          
          value = evaluateFormula(component.formula, dependencyValues, period, this.context);
        } else {
          throw new Error(`Unsupported component type: ${component.type}`);
        }
        
        // Store the calculated value
        node.values[period.id] = value;
        
        // Add to results
        results.push({
          componentId: node.id,
          periodId: period.id,
          value,
        });
      } catch (error) {
        // Add error to results
        results.push({
          componentId: node.id,
          periodId: period.id,
          value: null,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    
    // Mark node as calculated
    node.calculated = true;
  }
  
  public updateInput(componentId: string, periodId: string, value: any): CalculationResult[] {
    const node = this.nodes.get(componentId);
    if (!node) {
      throw new Error(`Component not found: ${componentId}`);
    }
    
    // Update the value
    node.values[periodId] = value;
    
    // Get all dependents
    const dependents = this.getAffectedNodes(componentId);
    
    // Reset calculated flag for all dependents
    for (const depId of dependents) {
      const depNode = this.nodes.get(depId);
      if (depNode) {
        depNode.calculated = false;
      }
    }
    
    // Recalculate all dependents
    const results: CalculationResult[] = [];
    for (const depId of dependents) {
      const depNode = this.nodes.get(depId);
      if (depNode && !depNode.calculated) {
        this.calculateNode(depNode, results);
      }
    }
    
    return results;
  }
  
  private getAffectedNodes(componentId: string): string[] {
    const visited = new Set<string>();
    const result: string[] = [];
    
    const visit = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      
      // Get direct dependents
      const dependents = this.getDependents(id);
      
      // Add to result
      result.push(...dependents);
      
      // Visit each dependent
      for (const depId of dependents) {
        visit(depId);
      }
    };
    
    visit(componentId);
    return result;
  }
}