// services/integration-service/src/schema.ts

import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  enum IntegrationType {
    CSV
    EXCEL
    API
    DATABASE
    ACCOUNTING_SOFTWARE
    CRM
    HRIS
    CUSTOM
  }

  enum DataDirection {
    IMPORT
    EXPORT
    BIDIRECTIONAL
  }

  enum AuthType {
    NONE
    API_KEY
    OAUTH2
    BASIC
    TOKEN
    CUSTOM
  }

  enum ConnectionStatus {
    ACTIVE
    INACTIVE
    ERROR
    PENDING
  }

  enum ScheduleFrequency {
    MANUAL
    HOURLY
    DAILY
    WEEKLY
    MONTHLY
    CUSTOM
  }

  type DataMapping {
    id: ID!
    dataSourceId: ID!
    sourceField: String!
    targetField: String!
    transform: String
    dataType: String!
  }

  type DataSource {
    id: ID!
    name: String!
    organizationId: ID!
    type: IntegrationType!
    description: String
    config: String!
    authConfig: String
    authType: AuthType!
    status: ConnectionStatus!
    dataDirection: DataDirection!
    mappings: [DataMapping!]!
    createdAt: String!
    updatedAt: String!
    createdBy: ID!
    updatedBy: ID!
  }

  type IntegrationJob {
    id: ID!
    dataSourceId: ID!
    modelId: ID
    status: String!
    startTime: String
    endTime: String
    recordsProcessed: Int
    errorMessage: String
    createdAt: String!
    createdBy: ID!
  }

  type SyncSchedule {
    id: ID!
    dataSourceId: ID!
    frequency: ScheduleFrequency!
    customCron: String
    nextRunTime: String!
    isActive: Boolean!
    createdAt: String!
    updatedAt: String!
    createdBy: ID!
    updatedBy: ID!
  }

  input DataMappingInput {
    sourceField: String!
    targetField: String!
    transform: String
    dataType: String!
  }

  input CreateDataSourceInput {
    name: String!
    type: IntegrationType!
    description: String
    config: String!
    authConfig: String
    authType: AuthType!
    dataDirection: DataDirection!
    mappings: [DataMappingInput!]!
  }

  input UpdateDataSourceInput {
    name: String
    description: String
    config: String
    authConfig: String
    authType: AuthType
    status: ConnectionStatus
    dataDirection: DataDirection
  }

  input UpdateMappingsInput {
    dataSourceId: ID!
    mappings: [DataMappingInput!]!
  }

  input CreateScheduleInput {
    dataSourceId: ID!
    frequency: ScheduleFrequency!
    customCron: String
    isActive: Boolean!
  }

  input UpdateScheduleInput {
    frequency: ScheduleFrequency
    customCron: String
    isActive: Boolean
  }

  input CSVImportInput {
    dataSourceId: ID!
    filePath: String
    fileUrl: String
    modelId: ID
    targetEntity: String!
    hasHeader: Boolean
    delimiter: String
    skipRows: Int
    maxRows: Int
    encoding: String
  }

  input ExcelImportInput {
    dataSourceId: ID!
    filePath: String
    fileUrl: String
    modelId: ID
    targetEntity: String!
    sheetName: String
    sheetIndex: Int
    hasHeader: Boolean
    skipRows: Int
    maxRows: Int
    range: String
  }

  type Query {
    dataSource(id: ID!): DataSource
    dataSources(organizationId: ID!): [DataSource!]!
    dataSourcesByType(organizationId: ID!, type: IntegrationType!): [DataSource!]!
    integrationJob(id: ID!): IntegrationJob
    integrationJobs(dataSourceId: ID!): [IntegrationJob!]!
    syncSchedule(id: ID!): SyncSchedule
    syncSchedules(dataSourceId: ID!): [SyncSchedule!]!
  }

  type Mutation {
    createDataSource(input: CreateDataSourceInput!): DataSource!
    updateDataSource(id: ID!, input: UpdateDataSourceInput!): DataSource!
    deleteDataSource(id: ID!): Boolean!
    
    updateMappings(input: UpdateMappingsInput!): [DataMapping!]!
    
    testConnection(id: ID!): Boolean!
    
    createSyncSchedule(input: CreateScheduleInput!): SyncSchedule!
    updateSyncSchedule(id: ID!, input: UpdateScheduleInput!): SyncSchedule!
    deleteSyncSchedule(id: ID!): Boolean!
    
    importCSV(input: CSVImportInput!): IntegrationJob!
    importExcel(input: ExcelImportInput!): IntegrationJob!
    
    triggerSync(dataSourceId: ID!): IntegrationJob!
    cancelJob(id: ID!): Boolean!
  }
`;