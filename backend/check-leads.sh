#!/bin/bash

# Load database URL from .env
source .env

# Extract database connection details
DB_URL=$TENANT_DATABASE_URL

echo "Checking MetaLead table data..."
echo "================================"

# Run SQL query
psql $DB_URL -c 'SELECT id, name, phone, email, company, city, "businessType" FROM "MetaLead" LIMIT 10;'

echo ""
echo "Total leads count:"
psql $DB_URL -c 'SELECT COUNT(*) FROM "MetaLead";'
