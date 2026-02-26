// Fix webhook receiving issue - Check and update FeatureAssignment
// Run: node fix-webhook-receiving.js

require('dotenv').config();
const { PrismaClient } = require('@prisma/client-tenant');

async function fixWebhookReceiving() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.TENANT_DATABASE_URL
      }
    }
  });

  try {
    console.log('🔍 Checking FeatureAssignment configuration...\n');

    // Get current feature assignments
    const assignment = await prisma.featureAssignment.findFirst();

    if (!assignment) {
      console.log('❌ No FeatureAssignment found. Creating default configuration...');
      await prisma.featureAssignment.create({
        data: {
          whatsappChat: null,
          aiChatbot: null,
          quickReply: null,
          ecommerce: null,
          campaigns: null
        }
      });
      console.log('✅ Default configuration created. All phone numbers will handle all features.');
      return;
    }

    console.log('Current Feature Assignments:');
    console.log('----------------------------');
    console.log(`WhatsApp Chat: ${assignment.whatsappChat || 'Not assigned'}`);
    console.log(`AI Chatbot: ${assignment.aiChatbot || 'Not assigned'}`);
    console.log(`Quick Reply: ${assignment.quickReply || 'Not assigned'}`);
    console.log(`Ecommerce: ${assignment.ecommerce || 'Not assigned'}`);
    console.log(`Campaigns: ${assignment.campaigns || 'Not assigned'}`);
    console.log('');

    // Check if 916429964876580 is assigned to campaigns-only
    if (assignment.campaigns === '916429964876580') {
      console.log('⚠️  ISSUE FOUND: Phone 916429964876580 is assigned to "campaigns-only"');
      console.log('   This blocks incoming messages from customers.\n');
      
      console.log('🔧 Fixing: Removing campaigns-only restriction...');
      
      // Option 1: Remove from campaigns (allow all features)
      await prisma.featureAssignment.update({
        where: { id: assignment.id },
        data: {
          campaigns: null  // Remove campaigns-only restriction
        }
      });
      
      console.log('✅ Fixed! Phone 916429964876580 can now receive messages.');
      console.log('   It will handle all features (chat, campaigns, etc.)\n');
    } else if (assignment.whatsappChat === '916429964876580') {
      console.log('✅ Phone 916429964876580 is correctly configured for WhatsApp Chat.');
      console.log('   It should be able to receive messages.\n');
    } else {
      console.log('ℹ️  Phone 916429964876580 is not specifically assigned.');
      console.log('   It will use default behavior (handle all features).\n');
    }

    // Show recommended configuration
    console.log('📋 RECOMMENDED CONFIGURATION:');
    console.log('----------------------------');
    console.log('Webhook-1 (803957376127788): Assign to "whatsappChat" for customer conversations');
    console.log('Webhook-2 (916429964876580): Leave unassigned OR assign to "whatsappChat"');
    console.log('');
    console.log('To assign webhook-1 to whatsappChat, run:');
    console.log('UPDATE "FeatureAssignment" SET "whatsappChat" = \'803957376127788\' WHERE id = 1;');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixWebhookReceiving();
