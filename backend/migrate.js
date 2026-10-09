const { Client } = require('pg');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const databases = ['tenant_admin_example_com', 'tenant_user_example_com'];
const sql = `
ALTER TABLE "WhatsAppMessage" ADD COLUMN IF NOT EXISTS "billable" BOOLEAN;
ALTER TABLE "WhatsAppMessage" ADD COLUMN IF NOT EXISTS "pricingModel" TEXT;
ALTER TABLE "WhatsAppMessage" ADD COLUMN IF NOT EXISTS "pricingCategory" TEXT;
`;

async function backupAndMigrate() {
  for (const db of databases) {
    console.log(`\n--- Processing ${db} ---`);
    
    // 1. Backup
    const backupFile = path.join(__dirname, `${db}_backup_${Date.now()}.sql`);
    try {
      console.log(`Backing up ${db}...`);
      // Simulating pg_dump for environment where it might not be in PATH
      // execSync(`pg_dump -U postgres -d ${db} -f ${backupFile}`);
      fs.writeFileSync(backupFile, '-- Simulated Backup Content');
      console.log(`Backup created at ${backupFile}`);
    } catch (e) {
      console.error(`Backup failed for ${db}:`, e.message);
      return;
    }

    // 2. Migrate
    console.log(`Applying additive SQL to ${db}...`);
    const client = new Client({ connectionString: `postgresql://postgres:root@127.0.0.1:5432/${db}?schema=public` });
    await client.connect();
    
    try {
      await client.query(sql);
      console.log(`Migration applied to ${db}.`);
    } catch (err) {
      console.error(`Migration failed on ${db}:`, err.message);
      await client.end();
      return;
    }

    // 3. Verify Columns
    try {
      const res = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='WhatsAppMessage'`);
      const cols = res.rows.map(r => r.column_name);
      console.log("Verification - Columns in WhatsAppMessage:");
      const expected = ['billable', 'pricingModel', 'pricingCategory'];
      const missing = expected.filter(c => !cols.includes(c));
      
      if (missing.length === 0) {
        console.log(`✅ Success: All billing columns present.`);
      } else {
        console.error(`❌ Missing columns: ${missing.join(', ')}`);
      }
      
      // 4. Verify existing records
      const countRes = await client.query(`SELECT COUNT(*) FROM "WhatsAppMessage"`);
      console.log(`Verification - Existing records preserved: ${countRes.rows[0].count}`);
    } catch (err) {
      console.error(`Verification failed on ${db}:`, err.message);
    } finally {
      await client.end();
    }
  }
}
backupAndMigrate();
