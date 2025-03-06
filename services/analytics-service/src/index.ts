// services/analytics-service/src/index.ts

import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import cors from 'cors';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';
import { config } from './config';
import { connectDb } from './db';
import { authMiddleware, AuthenticatedRequest } from './middleware/auth';
import { initializeScheduler } from './utils/report-scheduler';

const app = express();

app.use(cors());
app.use(express.json());
app.use(authMiddleware);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

async function startServer() {
  // Connect to databases
  await connectDb();
  
  // Initialize report scheduler
  initializeScheduler();
  
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }: { req: AuthenticatedRequest }) => {
      return {
        user: req.user,
        sessionId: req.sessionId,
      };
    },
  });

  await server.start();
  server.applyMiddleware({ app });

  app.listen(config.port, () => {
    console.log(`Analytics Service running at http://localhost:${config.port}${server.graphqlPath}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// services/analytics-service/src/db/migrations/init.sql

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Reports Table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL,
  model_id UUID,
  organization_id UUID NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  config JSONB NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  updated_by VARCHAR(255) NOT NULL
);

-- Create indexes
CREATE INDEX idx_reports_organization_id ON reports(organization_id);
CREATE INDEX idx_reports_model_id ON reports(model_id);
CREATE INDEX idx_reports_type ON reports(type);
CREATE INDEX idx_reports_is_public ON reports(is_public);

-- Widgets Table
CREATE TABLE IF NOT EXISTS widgets (
  id UUID PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL,
  config JSONB NOT NULL,
  position JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  updated_by VARCHAR(255) NOT NULL
);

-- Create indexes
CREATE INDEX idx_widgets_report_id ON widgets(report_id);

-- Report Schedules Table
CREATE TABLE IF NOT EXISTS report_schedules (
  id UUID PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  frequency VARCHAR(50) NOT NULL,
  recipients TEXT[] NOT NULL,
  next_run_time TIMESTAMP NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_run_time TIMESTAMP,
  last_run_status VARCHAR(50),
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  updated_by VARCHAR(255) NOT NULL
);

-- Create indexes
CREATE INDEX idx_report_schedules_report_id ON report_schedules(report_id);
CREATE INDEX idx_report_schedules_next_run_time ON report_schedules(next_run_time);
CREATE INDEX idx_report_schedules_is_active ON report_schedules(is_active);

-- Query Cache Table
CREATE TABLE IF NOT EXISTS query_cache (
  id UUID PRIMARY KEY,
  query TEXT NOT NULL,
  params JSONB NOT NULL,
  result JSONB NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL
);

-- Create indexes
CREATE INDEX idx_query_cache_expires_at ON query_cache(expires_at);

-- Analytics Metrics Table
CREATE TABLE IF NOT EXISTS analytics_metrics (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  formula TEXT NOT NULL,
  model_id UUID,
  organization_id UUID NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  updated_by VARCHAR(255) NOT NULL
);

-- Create indexes
CREATE INDEX idx_analytics_metrics_organization_id ON analytics_metrics(organization_id);
CREATE INDEX idx_analytics_metrics_model_id ON analytics_metrics(model_id);
CREATE INDEX idx_analytics_metrics_is_public ON analytics_metrics(is_public);