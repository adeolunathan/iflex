// services/analytics-service/src/schema.ts

import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  enum ReportType {
    STANDARD
    CUSTOM
    DASHBOARD
  }

  enum WidgetType {
    TIME_SERIES
    METRICS
    TABLE
    PIE_CHART
    BAR_CHART
    HEAT_MAP
    TEXT
    KPI
  }

  enum ScheduleFrequency {
    MANUAL
    DAILY
    WEEKLY
    MONTHLY
    QUARTERLY
  }

  enum AggregationType {
    SUM
    AVERAGE
    MIN
    MAX
    FIRST
    LAST
    COUNT
  }

  type Position {
    x: Float!
    y: Float!
    width: Float!
    height: Float!
  }

  input PositionInput {
    x: Float!
    y: Float!
    width: Float!
    height: Float!
  }

  type Widget {
    id: ID!
    reportId: ID!
    name: String!
    description: String
    type: WidgetType!
    config: String!
    position: Position!
    createdAt: String!
    updatedAt: String!
    createdBy: ID!
    updatedBy: ID!
    data: String
  }

  type Report {
    id: ID!
    name: String!
    description: String
    type: ReportType!
    modelId: ID
    organizationId: ID!
    isPublic: Boolean!
    config: String!
    tags: [String!]!
    widgets: [Widget!]!
    createdAt: String!
    updatedAt: String!
    createdBy: ID!
    updatedBy: ID!
  }

  type ReportSchedule {
    id: ID!
    reportId: ID!
    frequency: ScheduleFrequency!
    recipients: [String!]!
    nextRunTime: String!
    isActive: Boolean!
    lastRunTime: String
    lastRunStatus: String
    createdAt: String!
    updatedAt: String!
    createdBy: ID!
    updatedBy: ID!
  }

  type AnalyticsMetric {
    id: ID!
    name: String!
    description: String
    formula: String!
    modelId: ID
    organizationId: ID!
    isPublic: Boolean!
    createdAt: String!
    updatedAt: String!
    createdBy: ID!
    updatedBy: ID!
  }

  input WidgetInput {
    name: String!
    description: String
    type: WidgetType!
    config: String!
    position: PositionInput!
  }

  input WidgetUpdateInput {
    name: String
    description: String
    config: String
    position: PositionInput
  }

  input ReportInput {
    name: String!
    description: String
    type: ReportType!
    modelId: ID
    isPublic: Boolean
    config: String!
    tags: [String!]
  }

  input ReportUpdateInput {
    name: String
    description: String
    config: String
    tags: [String!]
    isPublic: Boolean
  }

  input ScheduleInput {
    reportId: ID!
    frequency: ScheduleFrequency!
    recipients: [String!]!
    isActive: Boolean!
  }

  input ScheduleUpdateInput {
    frequency: ScheduleFrequency
    recipients: [String!]
    isActive: Boolean
  }

  input MetricInput {
    name: String!
    description: String
    formula: String!
    modelId: ID
    isPublic: Boolean
  }

  input MetricUpdateInput {
    name: String
    description: String
    formula: String
    isPublic: Boolean
  }

  type Query {
    report(id: ID!): Report
    reports(organizationId: ID!, modelId: ID): [Report!]!
    reportsByType(organizationId: ID!, type: ReportType!): [Report!]!
    widget(id: ID!): Widget
    widgetData(id: ID!): String!
    reportSchedule(id: ID!): ReportSchedule
    reportSchedules(reportId: ID!): [ReportSchedule!]!
    metric(id: ID!): AnalyticsMetric
    metrics(organizationId: ID!, modelId: ID): [AnalyticsMetric!]!
  }

  type Mutation {
    createReport(input: ReportInput!): Report!
    updateReport(id: ID!, input: ReportUpdateInput!): Report!
    deleteReport(id: ID!): Boolean!
    
    addWidget(reportId: ID!, input: WidgetInput!): Widget!
    updateWidget(id: ID!, input: WidgetUpdateInput!): Widget!
    deleteWidget(id: ID!): Boolean!
    
    createReportSchedule(input: ScheduleInput!): ReportSchedule!
    updateReportSchedule(id: ID!, input: ScheduleUpdateInput!): ReportSchedule!
    deleteReportSchedule(id: ID!): Boolean!
    
    sendReportNow(reportId: ID!, recipients: [String!]!): Boolean!
    
    createMetric(input: MetricInput!): AnalyticsMetric!
    updateMetric(id: ID!, input: MetricUpdateInput!): AnalyticsMetric!
    deleteMetric(id: ID!): Boolean!
  }
`;