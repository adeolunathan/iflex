// services/model-service/src/schema.ts

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

  enum TimePeriod {
    DAYS
    WEEKS
    MONTHS
    QUARTERS
    YEARS
  }

  type Position {
    x: Float!
    y: Float!
  }

  type ModelComponent {
    id: ID!
    name: String!
    description: String
    type: ComponentType!
    dataType: DataType!
    formula: String
    references: [ID]
    position: Position!
    createdAt: String!
    updatedAt: String!
    createdBy: ID!
    updatedBy: ID!
  }

  type TimeSeriesData {
    componentId: ID!
    period: String!
    value: String!
    scenarioId: ID
    versionId: ID
  }

  type FinancialModel {
    id: ID!
    name: String!
    description: String
    components: [ModelComponent!]!
    startDate: String!
    endDate: String!
    timePeriod: TimePeriod!
    periodCount: Int!
    organizationId: ID!
    createdAt: String!
    updatedAt: String!
    createdBy: ID!
    updatedBy: ID!
  }

  input PositionInput {
    x: Float!
    y: Float!
  }

  input ModelComponentInput {
    name: String!
    description: String
    type: ComponentType!
    dataType: DataType!
    formula: String
    references: [ID]
    position: PositionInput!
  }

  input TimeSeriesDataInput {
    componentId: ID!
    period: String!
    value: String!
    scenarioId: ID
    versionId: ID
  }

  input FinancialModelInput {
    name: String!
    description: String
    startDate: String!
    endDate: String!
    timePeriod: TimePeriod!
    organizationId: ID!
  }

  type Query {
    model(id: ID!): FinancialModel
    models(organizationId: ID!): [FinancialModel!]!
    component(id: ID!): ModelComponent
    timeSeriesData(componentId: ID!, scenarioId: ID, versionId: ID): [TimeSeriesData!]!
  }

  type Mutation {
    createModel(input: FinancialModelInput!): FinancialModel!
    updateModel(id: ID!, input: FinancialModelInput!): FinancialModel!
    deleteModel(id: ID!): Boolean!
    
    addComponent(modelId: ID!, input: ModelComponentInput!): ModelComponent!
    updateComponent(id: ID!, input: ModelComponentInput!): ModelComponent!
    deleteComponent(id: ID!): Boolean!
    
    addTimeSeriesData(input: [TimeSeriesDataInput!]!): Boolean!
    updateTimeSeriesData(input: [TimeSeriesDataInput!]!): Boolean!
    deleteTimeSeriesData(componentId: ID!, periods: [String!]!, scenarioId: ID, versionId: ID): Boolean!
  }
`;