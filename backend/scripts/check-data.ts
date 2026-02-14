import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:root@localhost:5432/whatsapp_campaign?schema=public',
    },
  },
});

async function checkData() {
  console.log('Checking database...\n');
  
  const users = await prisma.user.findMany();
  console.log(`Users: ${users.length}`);
  users.forEach(u => console.log(`  - ${u.email} (ID: ${u.id})`));
  
  const contacts = await prisma.contact.count();
  console.log(`\nContacts: ${contacts}`);
  
  const campaigns = await prisma.campaign.count();
  console.log(`Campaigns: ${campaigns}`);
  
  const messages = await prisma.whatsAppMessage.count();
  console.log(`Messages: ${messages}`);
  
  await prisma.$disconnect();
}

checkData();
