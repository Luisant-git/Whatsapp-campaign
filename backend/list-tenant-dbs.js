const { PrismaClient } = require('@prisma/client-central');

async function listTenantDatabases() {
    const prisma = new PrismaClient();

    try {
        const tenants = await prisma.tenant.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                databaseName: true,
                isActive: true
            }
        });

        console.log('📋 Tenant Databases:\n');
        tenants.forEach(tenant => {
            console.log(`ID: ${tenant.id}`);
            console.log(`Name: ${tenant.name}`);
            console.log(`Email: ${tenant.email}`);
            console.log(`Database: ${tenant.databaseName}`);
            console.log(`Active: ${tenant.isActive}`);
            console.log('---');
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

listTenantDatabases();
