import { PrismaClient } from '@prisma/client';
import { PrismaClient as CentralPrisma } from '@prisma/client-central';
import { PrismaClient as TenantPrisma } from '@prisma/client-tenant';
import { execSync } from 'child_process';

const oldPrisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:root@localhost:5432/whatsapp_campaign?schema=public',
    },
  },
});

async function migrate() {
  console.log('🚀 Starting migration to database-level multi-tenancy...\n');

  // Step 1: Create central database
  console.log('📦 Step 1: Creating central database...');
  try {
    await oldPrisma.$executeRawUnsafe(`CREATE DATABASE whatsapp_central`);
    console.log('✓ Central database created\n');
  } catch (e) {
    console.log('⚠ Central database already exists\n');
  }

  // Step 2: Skip migrations (already pushed schema)
  console.log('✓ Central database ready\n');

  // Step 3: Get all users
  console.log('📦 Step 3: Fetching users from old database...');
  const users = await oldPrisma.user.findMany();
  console.log(`✓ Found ${users.length} users\n`);

  // Step 4: Migrate each user
  for (const user of users) {
    console.log(`\n👤 Migrating user: ${user.email} (ID: ${user.id})`);
    const dbName = `tenant_${user.id}`;

    try {
      // Create tenant database
      await oldPrisma.$executeRawUnsafe(`CREATE DATABASE ${dbName}`);
      console.log(`  ✓ Created database: ${dbName}`);

      // Push tenant schema
      const tenantDbUrl = `postgresql://postgres:root@localhost:5432/${dbName}?schema=public`;
      process.env.TENANT_DATABASE_URL = tenantDbUrl;
      execSync(`npx prisma db push --schema=./prisma/schema-tenant.prisma --skip-generate`, {
        stdio: 'pipe',
      });
      console.log(`  ✓ Applied schema`);

      // Create tenant record in central DB
      const centralPrisma = new CentralPrisma();
      
      await centralPrisma.tenant.create({
        data: {
          email: user.email,
          name: user.name,
          password: user.password,
          isActive: user.isActive,
          dbName,
          dbHost: 'localhost',
          dbPort: 5432,
          dbUser: 'postgres',
          dbPassword: 'root',
          subscriptionId: user.subscriptionId,
          subscriptionStartDate: user.subscriptionStartDate,
          subscriptionEndDate: user.subscriptionEndDate,
        },
      });
      console.log(`  ✓ Created tenant record`);

      // Migrate data
      const tenantPrisma = new TenantPrisma({
        datasources: { db: { url: tenantDbUrl } },
      });

      await migrateData(user.id, tenantPrisma);
      await tenantPrisma.$disconnect();
      await centralPrisma.$disconnect();

      console.log(`  ✅ User migration complete`);
    } catch (error) {
      console.error(`  ❌ Error:`, error.message);
    }
  }

  console.log('\n\n✅ Migration completed successfully!');
  console.log('\n📝 Next steps:');
  console.log('1. Update services to use TenantPrismaService');
  console.log('2. Replace userId parameters with TenantContext');
  console.log('3. Test the application');
}

async function migrateData(userId: number, tenantPrisma: any) {
  // Contacts & Groups
  const contacts = await oldPrisma.contact.findMany({
    where: { userId },
    include: { group: true },
  });
  
  for (const contact of contacts) {
    await tenantPrisma.contact.create({
      data: {
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        place: contact.place,
        lastMessageDate: contact.lastMessageDate,
        dob: contact.dob,
        anniversary: contact.anniversary,
        group: contact.group
          ? {
              connectOrCreate: {
                where: { name: contact.group.name },
                create: { name: contact.group.name },
              },
            }
          : undefined,
      },
    });
  }

  // Master Configs
  const configs = await oldPrisma.masterConfig.findMany({ where: { userId } });
  for (const c of configs) {
    await tenantPrisma.masterConfig.create({
      data: {
        name: c.name,
        phoneNumberId: c.phoneNumberId,
        accessToken: c.accessToken,
        verifyToken: c.verifyToken,
        isActive: c.isActive,
      },
    });
  }

  // Messages
  const messages = await oldPrisma.whatsAppMessage.findMany({ where: { userId } });
  for (const m of messages) {
    await tenantPrisma.whatsAppMessage.create({
      data: {
        messageId: m.messageId,
        to: m.to,
        from: m.from,
        message: m.message,
        mediaType: m.mediaType,
        mediaUrl: m.mediaUrl,
        direction: m.direction,
        status: m.status,
      },
    });
  }

  // Auto Replies
  const autoReplies = await oldPrisma.autoReply.findMany({ where: { userId } });
  for (const r of autoReplies) {
    await tenantPrisma.autoReply.create({
      data: { triggers: r.triggers, response: r.response, isActive: r.isActive },
    });
  }

  // Quick Replies
  const quickReplies = await oldPrisma.quickReply.findMany({ where: { userId } });
  for (const r of quickReplies) {
    await tenantPrisma.quickReply.create({
      data: { triggers: r.triggers, buttons: r.buttons, isActive: r.isActive },
    });
  }

  // Chat Labels
  const labels = await oldPrisma.chatLabel.findMany({ where: { userId } });
  for (const l of labels) {
    await tenantPrisma.chatLabel.create({
      data: { phone: l.phone, labels: l.labels, manuallyEdited: l.manuallyEdited },
    });
  }

  // Documents
  const docs = await oldPrisma.document.findMany({ where: { userId } });
  for (const d of docs) {
    await tenantPrisma.document.create({
      data: { filename: d.filename, content: d.content },
    });
  }

  console.log(`  ✓ Migrated ${contacts.length} contacts, ${messages.length} messages, ${autoReplies.length} auto-replies`);
}

migrate()
  .catch(console.error)
  .finally(() => oldPrisma.$disconnect());
