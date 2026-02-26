-- Check webhook configuration
SELECT 
  'Webhook URL should be:' as info,
  'https://yourdomain.com/whatsapp/webhook/whatsapp_webhook_verify_token_123' as webhook_url;

-- Check if there are ANY messages for this phone number (incoming or outgoing)
SELECT 
  direction,
  COUNT(*) as count,
  MAX("createdAt") as last_message
FROM "WhatsAppMessage"
WHERE "phoneNumberId" = '916429964876580'
GROUP BY direction;

-- Check all messages in last 24 hours
SELECT 
  id,
  "from",
  message,
  direction,
  "phoneNumberId",
  "createdAt"
FROM "WhatsAppMessage"
WHERE "createdAt" > NOW() - INTERVAL '24 hours'
ORDER BY "createdAt" DESC
LIMIT 10;
