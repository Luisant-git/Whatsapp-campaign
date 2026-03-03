#!/bin/bash

echo "🚀 Setting up Flow Trigger Feature..."

echo "📦 Step 1: Pushing schema to database..."
npx prisma db push --schema=./prisma/schema-tenant.prisma

echo "🔧 Step 2: Generating Prisma client..."
npx prisma generate --schema=./prisma/schema-tenant.prisma

echo "✅ Flow Trigger setup complete!"
echo ""
echo "📝 How to use:"
echo "1. Go to Flow Manager in your frontend"
echo "2. Create a trigger with a keyword (e.g., 'book', 'appointment')"
echo "3. Select a flow and configure the message"
echo "4. When users send that keyword, the flow will be automatically triggered!"
