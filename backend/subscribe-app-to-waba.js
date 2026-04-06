const { PrismaClient } = require('@prisma/client-tenant');

async function subscribeAppToWABA() {
    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: 'postgresql://postgres:root@localhost:5432/tenant_sangarichettiar_gmail_com'
            }
        }
    });

    try {
        const masterConfig = await prisma.masterConfig.findFirst({
            where: { isActive: true }
        });

        if (!masterConfig) {
            console.log('❌ No active Master Config found');
            return;
        }

        console.log('📋 Master Config:');
        console.log(`   WABA ID: ${masterConfig.wabaId}`);
        console.log(`   Access Token: ${masterConfig.accessToken.substring(0, 20)}...\n`);

        // Subscribe app to WABA
        console.log('🔗 Subscribing app to WABA...');
        const subscribeUrl = `https://graph.facebook.com/v18.0/${masterConfig.wabaId}/subscribed_apps`;
        
        const response = await fetch(subscribeUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${masterConfig.accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Successfully subscribed app to WABA!');
            console.log(JSON.stringify(data, null, 2));
            
            console.log('\n🎉 Your app is now subscribed to receive webhooks!');
            console.log('Try sending a message to your WhatsApp number now.');
        } else {
            console.log(`❌ Failed to subscribe: ${response.status}`);
            const error = await response.text();
            console.log(error);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

subscribeAppToWABA();
