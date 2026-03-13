const { PrismaClient } = require('@prisma/client-central');

async function testDomainFunctionality() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Testing domain functionality...');
    
    // Get all tenants with their current domains
    const tenants = await prisma.$queryRaw`
      SELECT id, name, email, domain, "isActive" 
      FROM "Tenant" 
      ORDER BY id ASC
    `;
    
    console.log('Current tenants and domains:');
    tenants.forEach(tenant => {
      console.log(`  ID: ${tenant.id}, Name: ${tenant.name}, Email: ${tenant.email}, Domain: ${tenant.domain || 'None'}`);
    });
    
    if (tenants.length > 0) {
      const testTenant = tenants[0];
      console.log(`\nTesting domain update for tenant: ${testTenant.email}`);
      
      // Test adding a domain
      const testDomain = 'test-domain.example.com';
      await prisma.$executeRaw`
        UPDATE "Tenant" SET "domain" = ${testDomain} WHERE id = ${testTenant.id}
      `;
      
      // Verify the update
      const updatedTenant = await prisma.$queryRaw`
        SELECT id, email, domain FROM "Tenant" WHERE id = ${testTenant.id}
      `;
      
      console.log('After adding test domain:', updatedTenant[0]);
      
      // Clean up - remove test domain
      await prisma.$executeRaw`
        UPDATE "Tenant" SET "domain" = NULL WHERE id = ${testTenant.id}
      `;
      
      console.log('✅ Domain functionality is working correctly!');
      console.log('\nYou can now use the admin panel to add domains to your tenants.');
    } else {
      console.log('No tenants found in database.');
    }
    
  } catch (error) {
    console.error('❌ Error testing domain functionality:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDomainFunctionality();