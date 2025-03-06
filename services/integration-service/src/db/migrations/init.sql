// services/integration-service/src/db/migrations/init.sql

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Data Sources Table
CREATE TABLE IF NOT EXISTS data_sources (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  organization_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  description TEXT,
  config JSONB NOT NULL,
  auth_config JSONB,
  auth_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  data_direction VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  updated_by VARCHAR(255) NOT NULL
);

-- Create indexes
CREATE INDEX idx_data_sources_organization_id ON data_sources(organization_id);
CREATE INDEX idx_data_sources_type ON data_sources(type);

-- Data Mappings Table
CREATE TABLE IF NOT EXISTS data_mappings (
  id UUID PRIMARY KEY,
  data_source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
  source_field VARCHAR(255) NOT NULL,
  target_field VARCHAR(255) NOT NULL,
  transform TEXT,
  data_type VARCHAR(50) NOT NULL
);

-- Create index
CREATE INDEX idx_data_mappings_data_source_id ON data_mappings(data_source_id);

-- Integration Jobs Table
CREATE TABLE IF NOT EXISTS integration_jobs (
  id UUID PRIMARY KEY,
  data_source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
  model_id UUID,
  status VARCHAR(50) NOT NULL,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  records_processed INTEGER,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL,
  created_by VARCHAR(255) NOT NULL
);

-- Create indexes
CREATE INDEX idx_integration_jobs_data_source_id ON integration_jobs(data_source_id);
CREATE INDEX idx_integration_jobs_status ON integration_jobs(status);
CREATE INDEX idx_integration_jobs_created_at ON integration_jobs(created_at);

-- Sync Schedules Table
CREATE TABLE IF NOT EXISTS sync_schedules (
  id UUID PRIMARY KEY,
  data_source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
  frequency VARCHAR(50) NOT NULL,
  custom_cron VARCHAR(255),
  next_run_time TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  updated_by VARCHAR(255) NOT NULL
);

-- Create index
CREATE INDEX idx_sync_schedules_data_source_id ON sync_schedules(data_source_id);
CREATE INDEX idx_sync_schedules_next_run_time ON sync_schedules(next_run_time);