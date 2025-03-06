// services/user-management/src/db/migrations/init.sql

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations Table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  plan VARCHAR(50) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  roles TEXT[] NOT NULL DEFAULT '{}',
  organization_id UUID NOT NULL REFERENCES organizations(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login TIMESTAMP,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

-- Create index on organization_id for faster queries
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);

-- User Sessions Table
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL,
  last_active_at TIMESTAMP NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT
);

-- Create index on user_id for faster queries
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);

-- Permissions Table
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL
);

-- Create unique index on resource and action
CREATE UNIQUE INDEX idx_permissions_resource_action ON permissions(resource, action);

-- Role Permissions Table
CREATE TABLE IF NOT EXISTS role_permissions (
  role VARCHAR(50) NOT NULL,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role, permission_id)
);

-- Password Reset Tokens Table
CREATE TABLE IF NOT EXISTS password_resets (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  token UUID NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL
);

-- Create index on token for faster queries
CREATE INDEX idx_password_resets_token ON password_resets(token);

-- Insert default permissions
INSERT INTO permissions (id, name, description, resource, action, created_at)
VALUES
  (uuid_generate_v4(), 'View Models', 'View financial models', 'model', 'read', NOW()),
  (uuid_generate_v4(), 'Create Models', 'Create new financial models', 'model', 'create', NOW()),
  (uuid_generate_v4(), 'Edit Models', 'Edit financial models', 'model', 'update', NOW()),
  (uuid_generate_v4(), 'Delete Models', 'Delete financial models', 'model', 'delete', NOW()),
  (uuid_generate_v4(), 'View Components', 'View model components', 'component', 'read', NOW()),
  (uuid_generate_v4(), 'Create Components', 'Create new model components', 'component', 'create', NOW()),
  (uuid_generate_v4(), 'Edit Components', 'Edit model components', 'component', 'update', NOW()),
  (uuid_generate_v4(), 'Delete Components', 'Delete model components', 'component', 'delete', NOW()),
  (uuid_generate_v4(), 'View Users', 'View users in organization', 'user', 'read', NOW()),
  (uuid_generate_v4(), 'Create Users', 'Create new users in organization', 'user', 'create', NOW()),
  (uuid_generate_v4(), 'Edit Users', 'Edit users in organization', 'user', 'update', NOW()),
  (uuid_generate_v4(), 'Delete Users', 'Delete users in organization', 'user', 'delete', NOW()),
  (uuid_generate_v4(), 'View Organization', 'View organization details', 'organization', 'read', NOW()),
  (uuid_generate_v4(), 'Edit Organization', 'Edit organization details', 'organization', 'update', NOW()),
  (uuid_generate_v4(), 'View Reports', 'View financial reports', 'report', 'read', NOW()),
  (uuid_generate_v4(), 'Create Reports', 'Create financial reports', 'report', 'create', NOW()),
  (uuid_generate_v4(), 'Edit Reports', 'Edit financial reports', 'report', 'update', NOW()),
  (uuid_generate_v4(), 'Delete Reports', 'Delete financial reports', 'report', 'delete', NOW());

-- Assign permissions to roles
DO $$
DECLARE
  permission_id UUID;
BEGIN
  -- Admin role gets all permissions
  FOR permission_id IN SELECT id FROM permissions
  LOOP
    INSERT INTO role_permissions (role, permission_id)
    VALUES ('ADMIN', permission_id);
  END LOOP;
  
  -- Manager role permissions
  FOR permission_id IN SELECT id FROM permissions WHERE resource <> 'organization' OR action = 'read'
  LOOP
    INSERT INTO role_permissions (role, permission_id)
    VALUES ('MANAGER', permission_id);
  END LOOP;
  
  -- Editor role permissions
  FOR permission_id IN SELECT id FROM permissions 
    WHERE (resource IN ('model', 'component', 'report') AND action IN ('read', 'create', 'update'))
       OR (resource IN ('user', 'organization') AND action = 'read')
  LOOP
    INSERT INTO role_permissions (role, permission_id)
    VALUES ('EDITOR', permission_id);
  END LOOP;
  
  -- Viewer role permissions
  FOR permission_id IN SELECT id FROM permissions
    WHERE action = 'read'
  LOOP
    INSERT INTO role_permissions (role, permission_id)
    VALUES ('VIEWER', permission_id);
  END LOOP;
END
$$;

-- Create a default organization
INSERT INTO organizations (id, name, plan, is_active, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Default Organization',
  'BASIC',
  TRUE,
  NOW(),
  NOW()
);

-- Create a default admin user (password: admin123)
INSERT INTO users (
  id, email, password_hash, first_name, last_name, roles,
  organization_id, is_active, created_at, updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@example.com',
  '$2b$10$9XWRSt/ySXsrQQO9ToQG7uRfMAwD6i0JFvOFjAzNJ8X7xKGqb6WSK', -- password: admin123
  'Admin',
  'User',
  ARRAY['ADMIN'],
  '00000000-0000-0000-0000-000000000001',
  TRUE,
  NOW(),
  NOW()
);