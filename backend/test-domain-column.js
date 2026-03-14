const { PrismaClient } = require('@prisma/client-central');

async function testDomainColumn() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Testing domain column...');
    
    // Test if domain column exists by trying to query it
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'Tenant' AND column_name = 'domain'
    `;
    
    if (result.length > 0) {
      console.log('✅ Domain column exists:', result[0]);
      
      // Test updating a domain
      const tenants = await prisma.tenant.findMany({
        select: { id: true, email: true },
        take: 1
      });
      
      if (tenants.length > 0) {
        const testTenantId = tenants[0].id;
        console.log(`Testing domain update for tenant ID: ${testTenantId}`);
        
        // Try to update domain
        await prisma.$executeRaw`
          UPDATE "Tenant" SET "domain" = 'test.example.com' WHERE id = ${testTenantId}
        `;
        
        // Verify update
        const updatedTenant = await prisma.$queryRaw`
          SELECT id, email, domain FROM "Tenant" WHERE id = ${testTenantId}
        `;
        
        console.log('✅ Domain update successful:', updatedTenant[0]);
        
        // Clean up - remove test domain
        await prisma.$executeRaw`
          UPDATE "Tenant" SET "domain" = NULL WHERE id = ${testTenantId}
        `;
        
        console.log('✅ Test completed successfully!');
      }
    } else {
      console.log('❌ Domain column does not exist. Please run the SQL script first.');
    }
    
  } catch (error) {
    console.error('❌ Error testing domain column:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testDomainColumn();