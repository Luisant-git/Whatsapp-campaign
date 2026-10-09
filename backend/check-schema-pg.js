const { Client } = require('pg');
async function checkSchema() {
  const client = new Client({ connectionString: 'postgresql://postgres:root@127.0.0.1:5432/tenant_admin_example_com?schema=public' });
  await client.connect();
  try {
    const res = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='WhatsAppMessage'`);
    const cols = res.rows.map(r => r.column_name);
    console.log("Columns in tenant_admin_example_com.WhatsAppMessage:");
    console.log(cols.join(', '));
    console.log(`Needs migration? ${!cols.includes('billable')}`);
  } catch (err) {
    console.error(err.message);
  } finally {
    await client.end();
  }
}
checkSchema();
