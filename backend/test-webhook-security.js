const crypto = require('crypto');

function testWebhookSecurity() {
  const payload = JSON.stringify({ entry: [{ changes: [{ value: { messages: [{ id: "test" }] } }] }] });
  const secret = '942040dbe425bf8b39fba6b1539c2a8c'; // META_APP_SECRET from env
  const validSignature = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
  
  const validate = (body, sig, appSecret) => {
    if (!appSecret) return 'No App Secret available to verify webhook';
    if (!sig) return 'Missing x-hub-signature-256 header';
    
    const expectedSignature = 'sha256=' + crypto.createHmac('sha256', appSecret).update(body).digest('hex');
    const sigBuffer = Buffer.from(sig, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    
    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return 'Invalid x-hub-signature-256';
    }
    return 'Valid';
  };

  console.log('[TEST 1] Missing signature');
  console.log('Result:', validate(payload, null, secret) === 'Missing x-hub-signature-256 header' ? 'PASS' : 'FAIL');
  
  console.log('[TEST 2] Invalid signature');
  console.log('Result:', validate(payload, 'sha256=invalid', secret) === 'Invalid x-hub-signature-256' ? 'PASS' : 'FAIL');

  console.log('[TEST 3] Valid signature');
  console.log('Result:', validate(payload, validSignature, secret) === 'Valid' ? 'PASS' : 'FAIL');
}

testWebhookSecurity();
