import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import { CentralPrismaService } from '../central-prisma.service';
import axios from 'axios';

@Injectable()
export class FlowTriggerService {
  private readonly accessToken = process.env.META_ACCESS_TOKEN;
  private readonly phoneNumberId = process.env.PHONE_NUMBER_ID;

  constructor(
    private tenantPrisma: TenantPrismaService,
    private centralPrisma: CentralPrismaService,
  ) {}

  // Create a new flow trigger
  async createTrigger(userId: number, data: any) {
    const prisma = await this.getTenantClient(userId);
    return prisma.flowTrigger.create({
      data: {
        name: data.name,
        triggerWord: data.triggerWord.toLowerCase().trim(),
        flowId: data.flowId,
        headerText: data.headerText,
        bodyText: data.bodyText,
        footerText: data.footerText,
        ctaText: data.ctaText,
        screenName: data.screenName || 'SCREEN',
        screenData: data.screenData || {},
        isActive: data.isActive !== false,
      },
    });
  }

  // Get all triggers for a user
  async getTriggers(userId: number) {
    const prisma = await this.getTenantClient(userId);
    return prisma.flowTrigger.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  // Get single trigger
  async getTrigger(id: number, userId: number) {
    const prisma = await this.getTenantClient(userId);
    return prisma.flowTrigger.findFirst({
      where: { id },
    });
  }

  // Update trigger
  async updateTrigger(id: number, userId: number, data: any) {
    const prisma = await this.getTenantClient(userId);
    return prisma.flowTrigger.update({
      where: { id },
      data: {
        name: data.name,
        triggerWord: data.triggerWord?.toLowerCase().trim(),
        flowId: data.flowId,
        headerText: data.headerText,
        bodyText: data.bodyText,
        footerText: data.footerText,
        ctaText: data.ctaText,
        screenName: data.screenName,
        screenData: data.screenData,
        isActive: data.isActive,
        updatedAt: new Date(),
      },
    });
  }

  // Delete trigger
  async deleteTrigger(id: number, userId: number) {
    const prisma = await this.getTenantClient(userId);
    return prisma.flowTrigger.delete({
      where: { id },
    });
  }

  // Check if message matches any trigger and send flow (with tenant client)
  async checkAndSendFlowWithClient(message: string, phoneNumber: string, tenantClient: any, accessToken: string, phoneNumberId: string) {
    const triggerWord = message.toLowerCase().trim();
    console.log(`[FlowTrigger] Checking for trigger word: "${triggerWord}"`);
    
    const trigger = await tenantClient.flowTrigger.findFirst({
      where: {
        triggerWord,
        isActive: true,
      },
    });

    console.log(`[FlowTrigger] Found trigger:`, trigger);

    if (!trigger) {
      return null;
    }

    try {
      console.log(`[FlowTrigger] Sending flow message to ${phoneNumber}`);
      const response = await this.sendFlowMessage(phoneNumber, trigger, accessToken, phoneNumberId);
      console.log(`[FlowTrigger] Flow sent successfully:`, response.data);
      
      // Log success
      await tenantClient.flowTriggerLog.create({
        data: {
          flowTriggerId: trigger.id,
          phoneNumber,
          triggerWord,
          status: 'success',
          messageId: response.data.messages[0].id,
        },
      });

      return { success: true, trigger, messageId: response.data.messages[0].id };
    } catch (error) {
      console.error(`[FlowTrigger] Error sending flow:`, error.response?.data || error.message);
      // Log error
      await tenantClient.flowTriggerLog.create({
        data: {
          flowTriggerId: trigger.id,
          phoneNumber,
          triggerWord,
          status: 'failed',
          error: error.response?.data?.error?.message || error.message,
        },
      });

      return { success: false, trigger, error: error.message };
    }
  }

  // Send flow message via WhatsApp API
  private async sendFlowMessage(phoneNumber: string, trigger: any, accessToken: string, phoneNumberId: string) {
    const actionParams: any = {
      flow_message_version: '3',
      flow_token: `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      flow_id: trigger.flowId,
      flow_cta: trigger.ctaText,
      flow_action: 'navigate',
      flow_action_payload: {
        screen: trigger.screenName || 'SCREEN_ONE',
      }
    };

    // Add screen data if provided
    if (trigger.screenData && Object.keys(trigger.screenData).length > 0) {
      actionParams.flow_action_payload.data = trigger.screenData;
    }

    console.log('[FlowTrigger] Sending flow with params:', JSON.stringify(actionParams, null, 2));

    return axios.post(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneNumber,
        type: 'interactive',
        interactive: {
          type: 'flow',
          header: trigger.headerText ? {
            type: 'text',
            text: trigger.headerText,
          } : undefined,
          body: {
            text: trigger.bodyText || 'Click the button below to continue',
          },
          footer: trigger.footerText ? {
            text: trigger.footerText,
          } : undefined,
          action: {
            name: 'flow',
            parameters: actionParams,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
  }

  private async getTenantClient(userId: number) {
    const tenant = await this.centralPrisma.tenant.findUnique({ where: { id: userId } });
    if (!tenant) throw new Error('Tenant not found');
    const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
    return this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);
  }

  // Get trigger logs/analytics
  async getTriggerLogs(triggerId: number, userId: number) {
    const prisma = await this.getTenantClient(userId);
    const trigger = await this.getTrigger(triggerId, userId);
    if (!trigger) {
      throw new Error('Trigger not found');
    }

    const logs = await prisma.flowTriggerLog.findMany({
      where: { flowTriggerId: triggerId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const stats = await prisma.flowTriggerLog.groupBy({
      by: ['status'],
      where: { flowTriggerId: triggerId },
      _count: true,
    });

    return {
      trigger,
      logs,
      stats: {
        total: logs.length,
        success: stats.find(s => s.status === 'success')?._count || 0,
        failed: stats.find(s => s.status === 'failed')?._count || 0,
      },
    };
  }
}
