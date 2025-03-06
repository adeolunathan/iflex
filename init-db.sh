#!/bin/bash

echo "Running database initialization scripts..."

# Get container name
POSTGRES_CONTAINER=$(docker ps | grep flex.*postgres | awk '{print $NF}')

if [ -z "$POSTGRES_CONTAINER" ]; then
  echo "PostgreSQL container not found! Make sure it's running."
  exit 1
fi

# Model Service
echo "Initializing Model Service database..."
docker exec -i $POSTGRES_CONTAINER psql -U postgres -d financeforge < services/model-service/src/db/migrations/init.sql

# User Management Service
echo "Initializing User Management Service database..."
docker exec -i $POSTGRES_CONTAINER psql -U postgres -d financeforge < services/user-management/src/db/migrations/init.sql

# Analytics Service
echo "Initializing Analytics Service database..."
docker exec -i $POSTGRES_CONTAINER psql -U postgres -d financeforge < services/analytics-service/src/db/migrations/init.sql

# Integration Service
echo "Initializing Integration Service database..."
docker exec -i $POSTGRES_CONTAINER psql -U postgres -d financeforge < services/integration-service/src/db/migrations/init.sql

# Export Service
echo "Initializing Export Service database..."
docker exec -i $POSTGRES_CONTAINER psql -U postgres -d financeforge < services/export-service/src/db/migrations/init.sql

echo "Database initialization completed!"
