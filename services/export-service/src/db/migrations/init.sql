// services/export-service/src/db/migrations/init.sql

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Export Jobs Table
CREATE TABLE IF NOT EXISTS export_jobs (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  organization_id VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  format VARCHAR(50) NOT NULL,
  source_id VARCHAR(255) NOT NULL,
  config JSONB NOT NULL,
  status VARCHAR(50) NOT NULL,
  file_url TEXT,
  file_name VARCHAR(255),
  file_size INTEGER,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL,
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_export_jobs_user_id ON export_jobs(user_id);
CREATE INDEX idx_export_jobs_organization_id ON export_jobs(organization_id);
CREATE INDEX idx_export_jobs_source_id ON export_jobs(source_id);
CREATE INDEX idx_export_jobs_status ON export_jobs(status);
CREATE INDEX idx_export_jobs_created_at ON export_jobs(created_at);

-- Export Templates Table
CREATE TABLE IF NOT EXISTS export_templates (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL,
  format VARCHAR(50) NOT NULL,
  config JSONB NOT NULL,
  organization_id VARCHAR(255) NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  updated_by VARCHAR(255) NOT NULL
);

-- Create indexes
CREATE INDEX idx_export_templates_organization_id ON export_templates(organization_id);
CREATE INDEX idx_export_templates_type ON export_templates(type);
CREATE INDEX idx_export_templates_is_public ON export_templates(is_public);