import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import { CentralPrismaService } from '../central-prisma.service';
import { FlowManagerService } from './flows/flow-manager.service';
import axios from 'axios';

@Injectable()
export class FlowTriggerService {
  private readonly accessToken = process.env.META_ACCESS_TOKEN;
  private readonly phoneNumberId = process.env.PHONE_NUMBER_ID;

  constructor(
    private tenantPrisma: TenantPrismaService,
    private centralPrisma: CentralPrismaService,
    private flowManager: FlowManagerService,
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
    // Get flow info and create session
    const flow = await this.flowManager.getFlowById(trigger.flowId, '1'); // Replace with actual tenant ID
    if (!flow) {
      throw new Error(`Flow not found: ${trigger.flowId}`);
    }

    // Create flow session
    const flowToken = await this.flowManager.createFlowSession(
      trigger.flowId,
      phoneNumber,
      '1', // Replace with actual tenant ID
      flow.purpose
    );

    const actionParams: any = {
      flow_message_version: '3',
      flow_token: flowToken,
      flow_id: trigger.flowId,
      flow_cta: trigger.ctaText,
    };

    // Get initial data based on flow purpose
    try {
      const initialData = await this.flowManager.getFlowInitialData(flow.purpose);
      actionParams.flow_action_data = initialData;
    } catch (error) {
      console.error('Error getting initial data:', error);
      // Fallback to empty data
      actionParams.flow_action_data = {};
    }

    const interactive: any = {
      type: 'flow',
      body: {
        text: trigger.bodyText || 'Click the button below to continue',
      },
      action: {
        name: 'flow',
        parameters: actionParams,
      },
    };

    if (trigger.headerText) {
      interactive.header = {
        type: 'text',
        text: trigger.headerText,
      };
    }

    if (trigger.footerText) {
      interactive.footer = {
        text: trigger.footerText,
      };
    }

    console.log('[FlowTrigger] Sending flow:', JSON.stringify({ interactive }, null, 2));

    return axios.post(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneNumber,
        type: 'interactive',
        interactive,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
  }
  
  private async getAppointmentData() {
    // Get dynamic data from database
    try {
      // You should replace this with actual database calls
      const departments = [
        { id: 'shopping', title: 'Shopping & Groceries' },
        { id: 'clothing', title: 'Clothing & Apparel' },
        { id: 'beauty', title: 'Beauty & Personal Care' }
      ];
      
      const locations = [
        { id: '1', title: "King's Cross, London" },
        { id: '2', title: 'Oxford Street, London' }
      ];
      
      const dates = this.generateDates(7);
      
      const timeSlots = [
        { id: '10:30', title: '10:30 AM' },
        { id: '11:30', title: '11:30 AM' },
        { id: '12:30', title: '12:30 PM' },
        { id: '14:30', title: '2:30 PM' },
        { id: '16:30', title: '4:30 PM' }
      ];
      
      return {
        department: departments,
        location: locations,
        date: dates,
        time: timeSlots
      };
    } catch (error) {
      console.error('Error fetching appointment data:', error);
      return this.getDefaultAppointmentData();
    }
  }
  
  private generateDates(days: number): Array<{id: string, title: string}> {
    const dates: Array<{id: string, title: string}> = [];
    const today = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const dateStr = date.toISOString().split('T')[0];
      const dateTitle = date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: '2-digit', 
        year: 'numeric' 
      });
      
      dates.push({
        id: dateStr,
        title: dateTitle
      });
    }
    
    return dates;
  }
  
  private getDefaultAppointmentData() {
    return {
      department: [
        { id: 'shopping', title: 'Shopping & Groceries' },
        { id: 'clothing', title: 'Clothing & Apparel' },
        { id: 'beauty', title: 'Beauty & Personal Care' }
      ],
      location: [
        { id: '1', title: "King's Cross, London" },
        { id: '2', title: 'Oxford Street, London' }
      ],
      date: [
        { id: '2024-01-01', title: 'Mon Jan 01 2024' },
        { id: '2024-01-02', title: 'Tue Jan 02 2024' }
      ],
      time: [
        { id: '10:30', title: '10:30' },
        { id: '11:30', title: '11:30' },
        { id: '12:30', title: '12:30' }
      ]
    };
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
