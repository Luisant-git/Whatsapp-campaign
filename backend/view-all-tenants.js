add const { Client } = require('pg');
require('dotenv').config();

async function viewAllTenants() {
  const centralClient = new Client({
    connectionString: process.env.CENTRAL_DATABASE_URL
  });

  try {
    await centralClient.connect();
    console.log('\n=== ALL TENANTS ===\n');

    // Get all tenants (active and inactive)
    const tenantsResult = await centralClient.query(`
      SELECT 
        id,
        email,
        "businessName",
        "isActive",
        "dbName",
        "dbHost",
        "dbPort",
        "dbUser",
        domain,
        "createdAt"
      FROM "Tenant"
      ORDER BY id ASC
    `);

    console.log(`Total Tenants: ${tenantsResult.rows.length}\n`);
    console.log('─'.repeat(100));

    tenantsResult.rows.forEach((tenant, index) => {
      console.log(`\n${index + 1}. Tenant ID: ${tenant.id}`);
      console.log(`   Business Name: ${tenant.businessName || 'N/A'}`);
      console.log(`   Email: ${tenant.email}`);
      console.log(`   Status: ${tenant.isActive ? '✅ Active' : '❌ Inactive'}`);
      console.log(`   Domain: ${tenant.domain || 'N/A'}`);
      console.log(`   Database: ${tenant.dbName}`);
      console.log(`   DB Host: ${tenant.dbHost}:${tenant.dbPort}`);
      console.log(`   DB User: ${tenant.dbUser}`);
      console.log(`   Created: ${new Date(tenant.createdAt).toLocaleDateString()}`);
      console.log('─'.repeat(100));
    });

    // Get detailed info for each active tenant
    console.log('\n\n=== ACTIVE TENANTS DETAILS ===\n');

    const activeTenants = tenantsResult.rows.filter(t => t.isActive);

    for (const tenant of activeTenants) {
      console.log(`\n╔═══ Tenant: ${tenant.businessName || tenant.email} (ID: ${tenant.id}) ═══╗`);
      
      const tenantClient = new Client({
        user: tenant.dbUser,
        password: await getTenantPassword(centralClient, tenant.id),
        host: tenant.dbHost,
        port: tenant.dbPort,
        database: tenant.dbName
      });

      try {
        await tenantClient.connect();

        // Get WhatsApp Settings count
        const settingsCount = await tenantClient.query(
          'SELECT COUNT(*) as count FROM "WhatsAppSettings"'
        );

        // Get MasterConfig count
        const masterConfigCount = await tenantClient.query(
          'SELECT COUNT(*) as count FROM "MasterConfig" WHERE "isActive" = true'
        );

        // Get Contacts count
        const contactsCount = await tenantClient.query(
          'SELECT COUNT(*) as count FROM "Contact"'
        );

        // Get Messages count
        const messagesCount = await tenantClient.query(
          'SELECT COUNT(*) as count FROM "WhatsAppMessage"'
        );

        // Get Campaigns count
        const campaignsCount = await tenantClient.query(
          'SELECT COUNT(*) as count FROM "Campaign"'
        );

        console.log(`│ WhatsApp Settings: ${settingsCount.rows[0].count}`);
        console.log(`│ Master Configs: ${masterConfigCount.rows[0].count}`);
        console.log(`│ Contacts: ${contactsCount.rows[0].count}`);
        console.log(`│ Messages: ${messagesCount.rows[0].count}`);
        console.log(`│ Campaigns: ${campaignsCount.rows[0].count}`);

        // Get Phone Number IDs
        const phoneNumbers = await tenantClient.query(`
          SELECT DISTINCT "phoneNumberId" FROM "WhatsAppSettings"
          UNION
          SELECT DISTINCT "phoneNumberId" FROM "MasterConfig" WHERE "isActive" = true
        `);

        if (phoneNumbers.rows.length > 0) {
          console.log(`│ Phone Number IDs:`);
          phoneNumbers.rows.forEach(pn => {
            console.log(`│   - ${pn.phoneNumberId}`);
          });
        }

        console.log(`╚${'═'.repeat(50)}╝`);

      } catch (error) {
        console.log(`│ ❌ Error connecting to tenant database: ${error.message}`);
        console.log(`╚${'═'.repeat(50)}╝`);
      } finally {
        await tenantClient.end();
      }
    }

    console.log('\n\n=== SUMMARY ===');
    console.log(`Total Tenants: ${tenantsResult.rows.length}`);
    console.log(`Active Tenants: ${activeTenants.length}`);
    console.log(`Inactive Tenants: ${tenantsResult.rows.length - activeTenants.length}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await centralClient.end();
  }
}

async function getTenantPassword(client, tenantId) {
  const result = await client.query(
    'SELECT "dbPassword" FROM "Tenant" WHERE id = $1',
    [tenantId]
  );
  return result.rows[0]?.dbPassword;
}

viewAllTenants();
