const { PrismaClient } = require('@prisma/client-tenant');

async function listMasterConfigs() {
    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: 'postgresql://postgres:root@localhost:5432/tenant_sangarichettiar_gmail_com'
            }
        }
    });

    try {
        const configs = await prisma.masterConfig.findMany({
            select: {
                id: true,
                name: true,
                phoneNumberId: true,
                wabaId: true,
                appId: true,
                isActive: true
            }
        });

        console.log('📋 Master Configs:\n');
        if (configs.length === 0) {
            console.log('❌ No Master Config records found');
        } else {
            configs.forEach(config => {
                console.log(`ID: ${config.id}`);
                console.log(`Name: ${config.name}`);
                console.log(`Phone Number ID: ${config.phoneNumberId}`);
                console.log(`WABA ID: ${config.wabaId}`);
                console.log(`App ID: ${config.appId}`);
                console.log(`Active: ${config.isActive}`);
                console.log('---');
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

listMasterConfigs();
