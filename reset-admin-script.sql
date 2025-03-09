-- reset-admin.sql
-- This script creates a new admin user with a known password

-- First make sure we have the extension for uuid
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Check if default organization exists
DO $$
DECLARE
  org_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO org_count FROM organizations WHERE id = '00000000-0000-0000-0000-000000000001';
  
  IF org_count = 0 THEN
    -- Create default organization
    INSERT INTO organizations (
      id, name, plan, is_active, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000001',
      'Default Organization',
      'BASIC',
      TRUE,
      NOW(),
      NOW()
    );
    RAISE NOTICE 'Created default organization';
  END IF;
END
$$;

-- Create a new admin user or update existing one
-- Password: admin123 (hash generated with bcrypt)
DO $$
DECLARE
  user_exists INTEGER;
BEGIN
  -- Check if admin@example.com exists
  SELECT COUNT(*) INTO user_exists FROM users WHERE email = 'admin@example.com';
  
  IF user_exists > 0 THEN
    -- Update existing user
    UPDATE users 
    SET password_hash = '$2b$10$9XWRSt/ySXsrQQO9ToQG7uRfMAwD6i0JFvOFjAzNJ8X7xKGqb6WSK',
        roles = ARRAY['ADMIN'],
        is_active = TRUE,
        updated_at = NOW()
    WHERE email = 'admin@example.com';
    RAISE NOTICE 'Updated admin user with email admin@example.com';
  ELSE
    -- Create new admin user
    INSERT INTO users (
      id, email, password_hash, first_name, last_name, 
      roles, organization_id, is_active, created_at, updated_at
    ) VALUES (
      '10000000-0000-0000-0000-000000000001', -- Different UUID from default
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
    RAISE NOTICE 'Created new admin user with email admin@example.com';
  END IF;
END
$$;

-- Create a second admin user with a different email (as a backup)
DO $$
BEGIN
  INSERT INTO users (
    id, email, password_hash, first_name, last_name, 
    roles, organization_id, is_active, created_at, updated_at
  ) VALUES (
    '20000000-0000-0000-0000-000000000001',
    'superadmin@example.com',
    '$2b$10$9XWRSt/ySXsrQQO9ToQG7uRfMAwD6i0JFvOFjAzNJ8X7xKGqb6WSK', -- password: admin123
    'Super',
    'Admin',
    ARRAY['ADMIN'],
    '00000000-0000-0000-0000-000000000001',
    TRUE,
    NOW(),
    NOW()
  ) ON CONFLICT (email) DO NOTHING;
END
$$;