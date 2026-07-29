import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const campaigns = await prisma.campaign.findMany({
    where: { name: 'job_offer_snp' }
  });
  console.log('Campaigns:', JSON.stringify(campaigns, null, 2));

  if (campaigns.length === 0) return;

  const campaign = campaigns[campaigns.length - 1]; // get the latest one
  const campaignId = campaign.id;

  // Let's see how many messages are in WhatsAppMessage for this campaign template today
  const messages = await prisma.whatsAppMessage.findMany({
    where: {
      message: {
        contains: 'Template job_offer_snp'
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Found ${messages.length} messages in WhatsAppMessage matching the template.`);

  if (messages.length > 0) {
      // Find the messages from the FIRST run.
      // We can sort by date and find clusters, or just take the ones from before the accidental second run.
      // E.g. find the earliest message and the latest message before today's second run.
      
      const firstRunMessages = messages.filter(m => m.createdAt < new Date(campaign.updatedAt));
      console.log(`Found ${firstRunMessages.length} messages from BEFORE the last update of the campaign.`);
  }

}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
