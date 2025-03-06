// services/model-service/src/db/migrations/init.sql

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Financial Models Table
CREATE TABLE IF NOT EXISTS financial_models (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  time_period VARCHAR(50) NOT NULL,
  period_count INTEGER NOT NULL,
  organization_id UUID NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  updated_by VARCHAR(255) NOT NULL
);

-- Create index on organization_id for faster queries
CREATE INDEX idx_financial_models_organization_id ON financial_models(organization_id);

-- Model Components Table
CREATE TABLE IF NOT EXISTS model_components (
  id UUID PRIMARY KEY,
  model_id UUID NOT NULL REFERENCES financial_models(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL,
  data_type VARCHAR(50) NOT NULL,
  formula TEXT,
  references TEXT[] DEFAULT '{}',
  position_x NUMERIC NOT NULL,
  position_y NUMERIC NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  updated_by VARCHAR(255) NOT NULL
);

-- Create index on model_id for faster queries
CREATE INDEX idx_model_components_model_id ON model_components(model_id);

-- Time Series Data Table
CREATE TABLE IF NOT EXISTS time_series_data (
  component_id UUID NOT NULL REFERENCES model_components(id) ON DELETE CASCADE,
  period VARCHAR(50) NOT NULL,
  value TEXT NOT NULL,
  scenario_id VARCHAR(255) DEFAULT 'default',
  version_id VARCHAR(255) DEFAULT 'default',
  PRIMARY KEY (component_id, period, scenario_id, version_id)
);

-- Create index on component_id for faster queries
CREATE INDEX idx_time_series_data_component_id ON time_series_data(component_id);