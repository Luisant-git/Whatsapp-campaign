import { Injectable } from '@nestjs/common';
import { BaseTenantService } from '../base-tenant.service';
import { TenantPrismaService } from '../tenant-prisma.service';
import { CentralPrismaService } from '../central-prisma.service';
import { TenantContext } from '../tenant/tenant.decorator';
import axios from 'axios';

@Injectable()
export class FlowTriggerService extends BaseTenantService {
  private readonly accessToken = process.env.META_ACCESS_TOKEN;
  private readonly phoneNumberId = process.env.PHONE_NUMBER_ID;

  constructor(
    tenantPrisma: TenantPrismaService,
    centralPrisma: CentralPrismaService,
  ) {
    super(tenantPrisma, centralPrisma);
  }

  // Create a new flow trigger
  async createTrigger(userId: number, data: any) {
    const prisma = await this.getTenantDb(userId);
    return prisma.flowTrigger.create({
      data: {
        name: data.name,
        triggerWord: data.triggerWord.toLowerCase().trim(),
        flowId: data.flowId,
        headerText: data.headerText,
        bodyText: data.bodyText,
        footerText: data.footerText,
        ctaText: data.ctaText,
        screenName: data.screenName || 'APPOINTMENT',
        screenData: data.screenData || {},
        isActive: data.isActive !== false,
        userId,
      },
    });
  }

  // Get all triggers for a user
  async getTriggers(userId: number) {
    const prisma = await this.getTenantDb(userId);
    return prisma.flowTrigger.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Get single trigger
  async getTrigger(id: number, userId: number) {
    const prisma = await this.getTenantDb(userId);
    return prisma.flowTrigger.findFirst({
      where: { id, userId },
    });
  }

  // Update trigger
  async updateTrigger(id: number, userId: number, data: any) {
    const prisma = await this.getTenantDb(userId);
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
    const prisma = await this.getTenantDb(userId);
    return prisma.flowTrigger.delete({
      where: { id },
    });
  }

  // Check if message matches any trigger and send flow
  async checkAndSendFlow(message: string, phoneNumber: string, userId: number) {
    const prisma = await this.getTenantDb(userId);
    const triggerWord = message.toLowerCase().trim();
    
    const trigger = await prisma.flowTrigger.findFirst({
      where: {
        userId,
        triggerWord,
        isActive: true,
      },
    });

    if (!trigger) {
      return null;
    }

    try {
      const response = await this.sendFlowMessage(phoneNumber, trigger);
      
      // Log success
      await prisma.flowTriggerLog.create({
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
      // Log error
      await prisma.flowTriggerLog.create({
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
  private async sendFlowMessage(phoneNumber: string, trigger: any) {
    return axios.post(
      `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`,
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
            parameters: {
              flow_message_version: '3',
              flow_token: `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              flow_id: trigger.flowId,
              flow_cta: trigger.ctaText,
              flow_action: 'navigate',
              flow_action_payload: {
                screen: trigger.screenName,
                data: trigger.screenData,
              },
            },
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
  }

  // Get trigger logs/analytics
  async getTriggerLogs(triggerId: number, userId: number) {
    const prisma = await this.getTenantDb(userId);
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
