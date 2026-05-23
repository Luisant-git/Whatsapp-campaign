#!/bin/bash

echo "🔧 Fixing CORS for whatsapp.api.luisant.cloud"

# Copy nginx config
sudo cp nginx-api-config.conf /etc/nginx/sites-available/whatsapp.api.luisant.cloud

# Enable site
sudo ln -sf /etc/nginx/sites-available/whatsapp.api.luisant.cloud /etc/nginx/sites-enabled/

# Test nginx config
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx config valid"
    
    # Reload nginx
    sudo systemctl reload nginx
    echo "✅ Nginx reloaded"
    
    # Restart backend to ensure CORS is applied
    cd /root/Whatsapp-campaign/backend
    pm2 restart whatsapp-backend
    echo "✅ Backend restarted"
    
    echo ""
    echo "🎉 CORS fix applied! Test with: node test-cors.js"
else
    echo "❌ Nginx config has errors"
    exit 1
fi
