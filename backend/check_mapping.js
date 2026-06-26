const { PrismaClient } = require('@prisma/client-central');
require('dotenv').config();

async function main() {
  const c = new PrismaClient({datasources:{db:{url:process.env.CENTRAL_DATABASE_URL}}});
  try {
    const mappings = await c.phoneNumberMapping.findMany({where:{phoneNumberId:'102588026101837'}});
    console.log("Central mappings for 102588026101837:", mappings);

    // Also check Tenant 12 mapping:
    const t12Mappings = await c.phoneNumberMapping.findMany({where:{tenantId: 12}});
    console.log("Central mappings for Tenant 12:", t12Mappings);

    // If mapped to Tenant 1, let's fix it!
    if (mappings.length > 0 && mappings[0].tenantId === 1) {
      console.log("Deleting incorrect mapping for Tenant 1...");
      await c.phoneNumberMapping.delete({ where: { id: mappings[0].id } });
      console.log("✅ Deleted. It will now successfully fall back to Tenant 12!");
    } else if (mappings.length === 0) {
      console.log("No central mapping found. Creating one for Tenant 12...");
      await c.phoneNumberMapping.create({
        data: {
          phoneNumberId: '102588026101837',
          tenantId: 12
        }
      });
      console.log("✅ Created mapping for Tenant 12!");
    }

  } catch(e) {
    console.error(e);
  } finally {
    await c.$disconnect();
  }
}
main();
