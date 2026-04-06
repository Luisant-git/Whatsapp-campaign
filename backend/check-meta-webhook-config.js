const { PrismaClient } = require('@prisma/client-tenant');

async function checkMetaWebhookConfig() {
    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: 'postgresql://postgres:root@localhost:5432/tenant_sangarichettiar_gmail_com'
            }
        }
    });

    try {
        console.log('🔍 Checking Meta webhook configuration...\n');

        // Get tenant 7 Master Config
        const masterConfig = await prisma.masterConfig.findFirst({
            where: {
                isActive: true
            }
        });

        if (!masterConfig) {
            console.log('❌ No active Master Config found for tenant 7');
            return;
        }

        console.log('📋 Master Config found:');
        console.log(`   Phone Number ID: ${masterConfig.phoneNumberId}`);
        console.log(`   WABA ID: ${masterConfig.wabaId}`);
        console.log(`   App ID: ${masterConfig.appId}`);
        console.log(`   Access Token: ${masterConfig.accessToken.substring(0, 20)}...`);
        console.log(`   Verify Token: ${masterConfig.verifyToken}\n`);

        // Check webhook subscription for the WABA
        console.log('🔗 Checking webhook subscription...');
        const webhookUrl = `https://graph.facebook.com/v18.0/${masterConfig.wabaId}/subscribed_apps`;
        
        const response = await fetch(webhookUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${masterConfig.accessToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('📡 Subscribed apps:');
            console.log(JSON.stringify(data, null, 2));
            
            if (data.data && data.data.length > 0) {
                console.log('\n✅ Apps are subscribed to this WABA');
                console.log('Now checking the webhook configuration in Meta App Dashboard manually...');
            } else {
                console.log('❌ No apps subscribed to this WABA');
            }
        } else {
            console.log(`❌ Failed to get subscribed apps: ${response.status}`);
            const error = await response.text();
            console.log(error);
            console.log('\n💡 To check webhook URL, go to:');
            console.log('https://developers.facebook.com/apps/');
            console.log('Select your app > WhatsApp > Configuration');
        }

        // Check phone number status
        console.log('\n📱 Checking phone number status...');
        const phoneUrl = `https://graph.facebook.com/v18.0/${masterConfig.phoneNumberId}`;
        
        const phoneResponse = await fetch(phoneUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${masterConfig.accessToken}`
            }
        });

        if (phoneResponse.ok) {
            const phoneData = await phoneResponse.json();
            console.log('📞 Phone number details:');
            console.log(`   Display Name: ${phoneData.display_phone_number}`);
            console.log(`   Verified Name: ${phoneData.verified_name}`);
            console.log(`   Quality Rating: ${phoneData.quality_rating}`);
            console.log(`   Status: ${phoneData.status || 'Not specified'}`);
            
            // Check if phone is in production mode
            if (phoneData.status === 'CONNECTED') {
                console.log('✅ Phone number is in PRODUCTION mode');
            } else {
                console.log('⚠️  Phone number might be in TEST mode');
            }
        } else {
            console.log(`❌ Failed to get phone number details: ${phoneResponse.status}`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkMetaWebhookConfig();