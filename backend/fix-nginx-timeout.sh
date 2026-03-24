#!/bin/bash

# Fix Nginx 502 timeout for Meta Catalog sync
# This script updates nginx configuration to handle long-running requests

echo "🔧 Fixing Nginx timeout configuration..."

# Backup current config
sudo cp /etc/nginx/sites-available/whatsapp.api.luisant.cloud /etc/nginx/sites-available/whatsapp.api.luisant.cloud.backup

# Update nginx config with timeout settings
sudo tee /etc/nginx/sites-available/whatsapp.api.luisant.cloud > /dev/null <<'EOF'
server {
    listen 80;
    server_name whatsapp.api.luisant.cloud;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name whatsapp.api.luisant.cloud;

    ssl_certificate /etc/letsencrypt/live/whatsapp.api.luisant.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/whatsapp.api.luisant.cloud/privkey.pem;

    location / {
        proxy_pass http://localhost:3010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeout settings for Meta API sync
        proxy_connect_timeout 5s;
        proxy_send_timeout 10s;
        proxy_read_timeout 10s;
        send_timeout 10s;
    }

    # Specific timeout for sync endpoints
    location ~ ^/ecommerce/products/[0-9]+/sync-meta$ {
        proxy_pass http://localhost:3010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Very short timeout since we return immediately
        proxy_connect_timeout 3s;
        proxy_send_timeout 5s;
        proxy_read_timeout 5s;
        send_timeout 5s;
    }
}
EOF

# Test nginx configuration
echo "🧪 Testing nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Configuration is valid"
    echo "🔄 Reloading nginx..."
    sudo systemctl reload nginx
    echo "✅ Nginx reloaded successfully!"
    echo ""
    echo "📝 Backup saved to: /etc/nginx/sites-available/whatsapp.api.luisant.cloud.backup"
else
    echo "❌ Configuration test failed!"
    echo "🔙 Restoring backup..."
    sudo cp /etc/nginx/sites-available/whatsapp.api.luisant.cloud.backup /etc/nginx/sites-available/whatsapp.api.luisant.cloud
    exit 1
fi
