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
                name: 'sangarichettiar@gmail.com',
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

        // Check webhook subscription for the app
        console.log('🔗 Checking webhook subscription...');
        const webhookUrl = `https://graph.facebook.com/v18.0/${masterConfig.appId}/subscriptions`;
        
        const response = await fetch(webhookUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${masterConfig.accessToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('📡 Webhook subscriptions:');
            console.log(JSON.stringify(data, null, 2));
            
            if (data.data && data.data.length > 0) {
                const subscription = data.data[0];
                console.log('\n✅ Current webhook configuration:');
                console.log(`   Callback URL: ${subscription.callback_url}`);
                console.log(`   Verify Token: ${subscription.verify_token}`);
                console.log(`   Fields: ${subscription.fields.join(', ')}`);
                console.log(`   Status: ${subscription.status}`);
                
                // Check if our URL matches
                const expectedUrl = 'https://whatsapp.api.luisant.cloud/whatsapp/webhook';
                if (subscription.callback_url === expectedUrl) {
                    console.log('✅ Webhook URL matches expected URL');
                } else {
                    console.log(`❌ Webhook URL MISMATCH!`);
                    console.log(`   Expected: ${expectedUrl}`);
                    console.log(`   Actual: ${subscription.callback_url}`);
                }
                
                // Check if messages field is subscribed
                if (subscription.fields.includes('messages')) {
                    console.log('✅ Messages field is subscribed');
                } else {
                    console.log('❌ Messages field is NOT subscribed');
                }
            } else {
                console.log('❌ No webhook subscriptions found');
            }
        } else {
            console.log(`❌ Failed to get webhook subscriptions: ${response.status}`);
            const error = await response.text();
            console.log(error);
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