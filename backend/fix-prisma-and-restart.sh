#!/bin/bash

echo "🔧 Regenerating Prisma Clients and Restarting Backend"
echo ""

cd /root/Whatsapp-campaign/backend

# 1. Generate Prisma clients
echo "1️⃣ Generating Prisma clients..."
npx prisma generate --schema=./prisma/schema-central.prisma
npx prisma generate --schema=./prisma/schema-tenant.prisma

if [ $? -ne 0 ]; then
    echo "❌ Prisma generation failed"
    exit 1
fi

echo "✅ Prisma clients generated"
echo ""

# 2. Build the project
echo "2️⃣ Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build successful"
echo ""

# 3. Test database connection
echo "3️⃣ Testing database connection..."
node test-db-connection.js

echo ""

# 4. Restart backend
echo "4️⃣ Restarting backend..."
pm2 restart whatsapp-backend

echo ""
echo "✅ Done! Check logs with: pm2 logs whatsapp-backend"
