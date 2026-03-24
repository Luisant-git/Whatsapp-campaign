#!/bin/bash

echo "🔍 Diagnosing Meta Sync 502 Issue..."
echo ""

# Check if backend is running
echo "1️⃣ Checking backend status..."
pm2 list | grep backend
echo ""

# Check backend logs for errors
echo "2️⃣ Recent backend logs:"
pm2 logs backend --lines 20 --nostream
echo ""

# Test backend directly (bypass nginx)
echo "3️⃣ Testing backend directly on localhost:3010..."
curl -X POST http://localhost:3010/ecommerce/products/1/sync-meta \
  -H "Content-Type: application/json" \
  -d '{}' \
  --max-time 5 \
  -v 2>&1 | head -20
echo ""

# Check nginx config
echo "4️⃣ Checking nginx configuration..."
sudo nginx -t
echo ""

# Check nginx error logs
echo "5️⃣ Recent nginx errors:"
sudo tail -20 /var/log/nginx/error.log
echo ""

echo "✅ Diagnostic complete!"
echo ""
echo "📝 Next steps:"
echo "   - If backend is not running: pm2 restart backend"
echo "   - If direct curl works but nginx fails: nginx config issue"
echo "   - If direct curl also fails: backend code issue"
