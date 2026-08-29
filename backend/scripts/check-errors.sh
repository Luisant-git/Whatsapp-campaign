#!/bin/bash
echo "Searching PM2 logs for WhatsApp API errors..."
grep -A 5 "Failed to send to" ~/.pm2/logs/*.log | tail -n 50
