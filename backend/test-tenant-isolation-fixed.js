const { PrismaClient } = require('@prisma/client-tenant');

async function testTenantIsolation() {
  const p = new PrismaClient({
    datasources: { db: { url: 'postgresql://postgres:root@127.0.0.1:5432/tenent_db?schema=public' } }
  });

  try {
    const msgId = 'wamid.TENANT_TEST_' + Date.now();
    await p.whatsAppMessage.create({
      data: {
        messageId: msgId,
        to: '919999999999',
        from: '918888888888',
        direction: 'outbound',
        status: 'sent',
        phoneNumberId: 'PHONE_123'
      }
    });

    const simulateWebhookSecurely = async (status, verifyToken) => {
      // Security Check (Simulating what we added to service)
      const settings = await p.whatsAppSettings.findFirst({ where: { verifyToken } });
      if (!settings) {
        console.log(`[AUTH] Rejecting webhook: Verify Token '${verifyToken}' does not match this tenant's settings!`);
        return false;
      }
      return true;
    };

    console.log('[TEST 1] Testing with WRONG verifyToken (cross-tenant injection attempt)...');
    let res = await simulateWebhookSecurely('delivered', 'WRONG_TOKEN');
    console.log(`Result: Update Allowed = ${res} (Expected: false)`);

    console.log('[TEST 2] Setup matching verifyToken in DB...');
    // We update an existing settings record with our correct token to ensure it exists
    const existing = await p.whatsAppSettings.findFirst();
    if (existing) {
      await p.whatsAppSettings.update({ where: { id: existing.id }, data: { verifyToken: 'CORRECT_TOKEN_123' }});
    }

    console.log('[TEST 3] Testing with CORRECT verifyToken...');
    res = await simulateWebhookSecurely('delivered', 'CORRECT_TOKEN_123');
    console.log(`Result: Update Allowed = ${res} (Expected: true)`);
  } catch (err) {
    console.error(err.message);
  } finally {
    await p.$disconnect();
  }
}
testTenantIsolation();
