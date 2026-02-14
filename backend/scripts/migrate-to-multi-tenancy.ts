import { PrismaClient } from '@prisma/client';
import { PrismaClient as CentralPrismaClient } from '@prisma/client-central';
import { PrismaClient as TenantPrismaClient } from '@prisma/client-tenant';
import { execSync } from 'child_process';

const oldPrisma = new PrismaClient();
const centralPrisma = new CentralPrismaClient();

async function migrateToMultiTenancy() {
  console.log('Starting migration to database-level multi-tenancy...');

  const users = await oldPrisma.user.findMany();

  for (const user of users) {
    console.log(`\nMigrating user: ${user.email}`);

    const dbName = `tenant_${user.id}`;
    const dbUser = `tenant_user_${user.id}`;
    const dbPassword = generatePassword();

    try {
      await oldPrisma.$executeRawUnsafe(`CREATE DATABASE ${dbName}`);
      await oldPrisma.$executeRawUnsafe(
        `CREATE USER ${dbUser} WITH PASSWORD '${dbPassword}'`,
      );
      await oldPrisma.$executeRawUnsafe(
        `GRANT ALL PRIVILEGES ON DATABASE ${dbName} TO ${dbUser}`,
      );

      console.log(`✓ Created database: ${dbName}`);

      const tenantDbUrl = `postgresql://${dbUser}:${dbPassword}@localhost:5432/${dbName}`;
      process.env.TENANT_DATABASE_URL = tenantDbUrl;
      execSync('npx prisma migrate deploy --schema=./prisma/schema-tenant.prisma', {
        stdio: 'inherit',
      });

      console.log(`✓ Applied migrations to ${dbName}`);

      await centralPrisma.tenant.create({
        data: {
          email: user.email,
          name: user.name,
          password: user.password,
          isActive: user.isActive,
          dbName,
          dbUser,
          dbPassword,
          subscriptionId: user.subscriptionId,
          subscriptionStartDate: user.subscriptionStartDate,
          subscriptionEndDate: user.subscriptionEndDate,
        },
      });

      console.log(`✓ Created tenant record in central database`);

      const tenantPrisma = new TenantPrismaClient({
        datasources: { db: { url: tenantDbUrl } },
      });

      await migrateUserData(user.id, tenantPrisma);
      await tenantPrisma.$disconnect();

      console.log(`✓ Migrated all data for user: ${user.email}`);
    } catch (error) {
      console.error(`✗ Error migrating user ${user.email}:`, error);
    }
  }

  console.log('\n✓ Migration completed!');
}

async function migrateUserData(userId: number, tenantPrisma: TenantPrismaClient) {
  const masterConfigs = await oldPrisma.masterConfig.findMany({
    where: { userId },
  });
  for (const config of masterConfigs) {
    await tenantPrisma.masterConfig.create({
      data: {
        name: config.name,
        phoneNumberId: config.phoneNumberId,
        accessToken: config.accessToken,
        verifyToken: config.verifyToken,
        isActive: config.isActive,
      },
    });
  }

  const messages = await oldPrisma.whatsAppMessage.findMany({
    where: { userId },
  });
  for (const msg of messages) {
    await tenantPrisma.whatsAppMessage.create({
      data: {
        messageId: msg.messageId,
        to: msg.to,
        from: msg.from,
        message: msg.message,
        mediaType: msg.mediaType,
        mediaUrl: msg.mediaUrl,
        direction: msg.direction,
        status: msg.status,
      },
    });
  }

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

  const autoReplies = await oldPrisma.autoReply.findMany({
    where: { userId },
  });
  for (const reply of autoReplies) {
    await tenantPrisma.autoReply.create({
      data: {
        triggers: reply.triggers,
        response: reply.response,
        isActive: reply.isActive,
      },
    });
  }

  const quickReplies = await oldPrisma.quickReply.findMany({
    where: { userId },
  });
  for (const reply of quickReplies) {
    await tenantPrisma.quickReply.create({
      data: {
        triggers: reply.triggers,
        buttons: reply.buttons,
        isActive: reply.isActive,
      },
    });
  }

  const chatLabels = await oldPrisma.chatLabel.findMany({
    where: { userId },
  });
  for (const label of chatLabels) {
    await tenantPrisma.chatLabel.create({
      data: {
        phone: label.phone,
        labels: label.labels,
        manuallyEdited: label.manuallyEdited,
      },
    });
  }

  const documents = await oldPrisma.document.findMany({
    where: { userId },
  });
  for (const doc of documents) {
    await tenantPrisma.document.create({
      data: {
        filename: doc.filename,
        content: doc.content,
      },
    });
  }

  console.log(`  ✓ Migrated all data records`);
}

function generatePassword(): string {
  return Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
}

migrateToMultiTenancy()
  .catch(console.error)
  .finally(() => {
    oldPrisma.$disconnect();
    centralPrisma.$disconnect();
  });
