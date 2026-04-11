#!/bin/bash

echo "🔄 Regenerating Prisma Clients..."

echo "📦 Generating Central Prisma Client..."
npx prisma generate --schema=./prisma/schema-central.prisma

echo "📦 Generating Tenant Prisma Client..."
npx prisma generate --schema=./prisma/schema-tenant.prisma

echo "✅ Prisma clients regenerated successfully!"
echo ""
echo "⚠️  Please restart your backend server for changes to take effect"
