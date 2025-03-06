// services/export-service/src/schema.ts

import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  enum ExportFormat {
    PDF
    EXCEL
    CSV
    JSON
    HTML
  }

  enum ExportType {
    MODEL
    REPORT
    DATA
  }

  enum ExportStatus {
    PENDING
    PROCESSING
    COMPLETED
    FAILED
  }

  type ExportJob {
    id: ID!
    userId: ID!
    organizationId: ID!
    type: ExportType!
    format: ExportFormat!
    sourceId: ID!
    config: String!
    status: ExportStatus!
    fileUrl: String
    fileName: String
    fileSize: Int
    errorMessage: String
    createdAt: String!
    startedAt: String
    completedAt: String
  }

  type ExportTemplate {
    id: ID!
    name: String!
    description: String
    type: ExportType!
    format: ExportFormat!
    config: String!
    organizationId: ID!
    isPublic: Boolean!
    createdAt: String!
    updatedAt: String!
    createdBy: ID!
    updatedBy: ID!
  }

  input ExportJobInput {
    type: ExportType!
    format: ExportFormat!
    sourceId: ID!
    config: String!
  }

  input ExportTemplateInput {
    name: String!
    description: String
    type: ExportType!
    format: ExportFormat!
    config: String!
    isPublic: Boolean
  }

  input ExportTemplateUpdateInput {
    name: String
    description: String
    format: ExportFormat
    config: String
    isPublic: Boolean
  }

  type Query {
    exportJob(id: ID!): ExportJob
    exportJobs(organizationId: ID!): [ExportJob!]!
    exportJobsByType(organizationId: ID!, type: ExportType!): [ExportJob!]!
    exportJobsBySource(sourceId: ID!): [ExportJob!]!
    
    exportTemplate(id: ID!): ExportTemplate
    exportTemplates(organizationId: ID!): [ExportTemplate!]!
    exportTemplatesByType(organizationId: ID!, type: ExportType!): [ExportTemplate!]!
  }

  type Mutation {
    createExportJob(input: ExportJobInput!): ExportJob!
    cancelExportJob(id: ID!): Boolean!
    
    createExportTemplate(input: ExportTemplateInput!): ExportTemplate!
    updateExportTemplate(id: ID!, input: ExportTemplateUpdateInput!): ExportTemplate!
    deleteExportTemplate(id: ID!): Boolean!
    
    exportWithTemplate(templateId: ID!, sourceId: ID!): ExportJob!
  }
`;