// services/calculation-engine/src/schema.ts

import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  enum ComponentType {
    INPUT
    FORMULA
    REFERENCE
    AGGREGATION
  }

  enum DataType {
    NUMBER
    PERCENTAGE
    CURRENCY
    DATE
    TEXT
    BOOLEAN
  }

  type ModelComponent {
    id: ID!
    name: String!
    description: String
    type: ComponentType!
    dataType: DataType!
    formula: String
    references: [ID]
  }

  type Period {
    id: ID!
    label: String!
    startDate: String!
    endDate: String!
  }

  type CalculationResult {
    componentId: ID!
    periodId: ID!
    value: String
    error: String
  }

  type CalculationResponse {
    results: [CalculationResult!]!
    executionTime: Float!
  }

  input ComponentInput {
    id: ID!
    name: String!
    description: String
    type: ComponentType!
    dataType: DataType!
    formula: String
    references: [ID]
  }

  input PeriodInput {
    id: ID!
    label: String!
    startDate: String!
    endDate: String!
  }

  input ValueInput {
    componentId: ID!
    periodId: ID!
    value: String!
  }

  type Query {
    healthCheck: String
  }

  type Mutation {
    calculateModel(
      modelId: ID!
      scenarioId: ID = "default"
      versionId: ID = "default"
      components: [ComponentInput!]!
      periods: [PeriodInput!]!
      initialValues: [ValueInput!]
    ): CalculationResponse!
    
    updateCalculation(
      modelId: ID!
      scenarioId: ID = "default"
      versionId: ID = "default"
      components: [ComponentInput!]!
      periods: [PeriodInput!]!
      updatedValues: [ValueInput!]!
    ): CalculationResponse!
    
    validateFormula(
      formula: String!
    ): Boolean!
  }
`;