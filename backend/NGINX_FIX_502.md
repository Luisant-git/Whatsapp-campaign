# Nginx Configuration Fix for 502 Bad Gateway

## Problem
The 502 Bad Gateway error occurs because nginx times out before the backend completes the Meta API sync.

## Solution 1: Update Nginx Configuration (Recommended)

SSH into your server and edit the nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/whatsapp.api.luisant.cloud
```

Add these timeout settings inside the `location` block that proxies to your backend:

```nginx
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
    
    # ADD THESE TIMEOUT SETTINGS
    proxy_connect_timeout 120s;
    proxy_send_timeout 120s;
    proxy_read_timeout 120s;
    send_timeout 120s;
}
```

Then reload nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Solution 2: Already Implemented - Async Processing

The backend code has been updated to:
1. **Return immediately** with a success message
2. **Process sync in background** without blocking the request
3. **Update product** once sync completes

This means:
- Frontend gets instant response (no 502)
- Sync happens in background
- You can check sync status with: `GET /ecommerce/products/:id/sync-status`

## Testing

After deploying the updated code:

1. Try syncing a product
2. You should get immediate response: `{ success: true, message: "Product sync started..." }`
3. Check sync status: `GET /ecommerce/products/9/sync-status`
4. Check backend logs for sync completion

## Backend Logs to Monitor

```bash
# On your server
pm2 logs backend

# Look for:
[Meta Sync] Starting sync for product: 9
[Meta Sync] Uploading product: product_9
[Meta Sync] Product uploaded successfully: <meta_id>
[Meta Sync] Product 9 synced successfully: <meta_id>
```

## If Still Getting 502

1. Check if backend is running: `pm2 status`
2. Check backend logs: `pm2 logs backend --lines 100`
3. Restart backend: `pm2 restart backend`
4. Check nginx error logs: `sudo tail -f /var/log/nginx/error.log`
