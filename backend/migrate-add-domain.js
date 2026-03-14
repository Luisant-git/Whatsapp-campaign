const { PrismaClient } = require('@prisma/client-central');

async function addDomainColumn() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Adding domain column to Tenant table...');
    
    // Check if column already exists
    const columnExists = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Tenant' AND column_name = 'domain'
    `;
    
    if (columnExists.length > 0) {
      console.log('✅ Domain column already exists!');
      return;
    }
    
    // Add domain column
    await prisma.$executeRaw`ALTER TABLE "Tenant" ADD COLUMN "domain" TEXT`;
    console.log('✅ Domain column added successfully!');
    
    // Add unique constraint
    try {
      await prisma.$executeRaw`ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_domain_key" UNIQUE ("domain")`;
      console.log('✅ Unique constraint added successfully!');
    } catch (error) {
      console.log('⚠️  Unique constraint may already exist:', error.message);
    }
    
    console.log('🎉 Migration completed! You can now use domain functionality.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('Please run the SQL script manually or check database permissions.');
  } finally {
    await prisma.$disconnect();
  }
}

addDomainColumn();