import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import { CentralPrismaService } from '../central-prisma.service';
import { FlowManagerService } from '../whatsapp/flows/flow-manager.service';
import axios from 'axios';

@Injectable()
export class FlowTriggerService {
  private readonly apiUrl = 'https://graph.facebook.com/v18.0';
  private readonly accessToken = process.env.META_ACCESS_TOKEN;
  private readonly phoneNumberId = process.env.PHONE_NUMBER_ID;

  constructor(
    private tenantPrisma: TenantPrismaService,
    private centralPrisma: CentralPrismaService,
    private flowManager: FlowManagerService,
  ) {}

  async sendFlowMessage({
    to,
    phoneNumberId,
    flowId,
    flowToken
  }: {
    to: string;
    phoneNumberId: string;
    flowId: string;
    flowToken: string;
  }) {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        to,
        type: 'interactive',
        interactive: {
          type: 'flow',
          body: {
            text: '🛒 Please complete your order details'
          },
          action: {
            name: 'flow',
            parameters: {
              flow_message_version: '3',
              flow_token: flowToken,
              flow_id: flowId,
              flow_cta: 'Complete Order',
              flow_action: 'data_exchange'
            }
          }
        }
      };

      const response = await axios.post(
        `${this.apiUrl}/${phoneNumberId}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Flow send error:', error.response?.data || error.message);
      throw error;
    }
  }

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
    
    // First, get all active triggers to see what's available
    const allTriggers = await tenantClient.flowTrigger.findMany({
      where: { isActive: true },
      select: { id: true, name: true, triggerWord: true }
    });
    console.log(`[FlowTrigger] All active triggers:`, allTriggers);
    
    const trigger = await tenantClient.flowTrigger.findFirst({
      where: {
        triggerWord,
        isActive: true,
      },
    });

    console.log(`[FlowTrigger] Found trigger for "${triggerWord}":`, trigger);

    if (!trigger) {
      return null;
    }

    try {
      console.log(`[FlowTrigger] Sending flow message to ${phoneNumber}`);
      const response = await this.sendFlowMessageInternal(phoneNumber, trigger, accessToken, phoneNumberId);
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

  // Send flow message via WhatsApp API with complete data
  private async sendFlowMessageInternal(phoneNumber: string, trigger: any, accessToken: string, phoneNumberId: string) {
    // Get tenant ID from phone number ID for session tracking
    const tenant = await this.centralPrisma.tenant.findFirst({
      where: { phoneNumberId: phoneNumberId }
    });
    
    if (!tenant) {
      console.warn(`Tenant not found for phone number ID: ${phoneNumberId}, proceeding without session`);
    }

    // Create flow token for session tracking
    const flowToken = `flow_${Date.now()}_${tenant?.id || 'unknown'}_${Math.random().toString(36).substr(2, 9)}`;

    const actionParams: any = {
      flow_message_version: '3',
      flow_token: flowToken,
      flow_id: trigger.flowId,
      flow_cta: trigger.ctaText,
      flow_action: 'data_exchange', // Use data_exchange to call endpoint for data
    };

    // DO NOT include flow_action_payload when using data_exchange
    // The data will be provided by the /flow-appointments/exchange endpoint

    console.log(`[FlowTrigger] Flow sent → flowId:${trigger.flowId} screen:${trigger.screenName} token:${flowToken}`);
    console.log('[FlowTrigger] Using data_exchange - data will be provided by endpoint');

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
  
  // Get complete appointment data from database
  private async getCompleteAppointmentData(tenantId?: number) {
    try {
      if (!tenantId) {
        return this.getDefaultAppointmentData();
      }

      // Get tenant database client
      const tenant = await this.centralPrisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) {
        return this.getDefaultAppointmentData();
      }

      const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
      const tenantClient = this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);

      // Get departments from database
      const departments = await (tenantClient as any).flowDepartment.findMany({
        where: { isActive: true },
        select: { name: true, title: true }
      });

      // Get locations from database
      const locations = await (tenantClient as any).flowLocation.findMany({
        where: { isActive: true },
        select: { name: true, title: true }
      });

      // Get time slots from database
      const timeSlots = await (tenantClient as any).flowTimeSlot.findMany({
        where: { isEnabled: true },
        select: { time: true, title: true }
      });

      // Generate available dates (next 14 days)
      const dates = this.generateAvailableDates(14);

      return {
        departments: departments.map(d => ({ id: d.name, title: d.title })),
        locations: locations.map(l => ({ id: l.name, title: l.title })),
        dates: dates,
        timeSlots: timeSlots.map(t => ({ id: t.time, title: t.title }))
      };
    } catch (error) {
      console.error('Error fetching complete appointment data:', error);
      return this.getDefaultAppointmentData();
    }
  }

  // Get user information from contacts or previous interactions
  private async getUserInfo(phoneNumber: string, tenantId?: number) {
    try {
      if (!tenantId) {
        return { phone: phoneNumber };
      }

      // Get tenant database client
      const tenant = await this.centralPrisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) {
        return { phone: phoneNumber };
      }

      const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
      const tenantClient = this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);

      // Try to find user in contacts
      const contact = await (tenantClient as any).contact.findFirst({
        where: { 
          OR: [
            { phone: phoneNumber },
            { phone: phoneNumber.replace(/^\+/, '') }, // Try without +
            { phone: `+${phoneNumber}` } // Try with +
          ]
        },
        select: { name: true, email: true, phone: true }
      });

      if (contact) {
        return {
          name: contact.name,
          email: contact.email,
          phone: contact.phone || phoneNumber
        };
      }

      // Try to find in previous flow appointments
      const previousAppointment = await (tenantClient as any).flowAppointment.findFirst({
        where: { phone: phoneNumber },
        orderBy: { createdAt: 'desc' },
        select: { name: true, email: true, phone: true }
      });

      if (previousAppointment) {
        return {
          name: previousAppointment.name,
          email: previousAppointment.email,
          phone: previousAppointment.phone
        };
      }

      return { phone: phoneNumber };
    } catch (error) {
      console.error('Error fetching user info:', error);
      return { phone: phoneNumber };
    }
  }

  // Generate available dates
  private generateAvailableDates(days: number): Array<{id: string, title: string}> {
    const dates: Array<{id: string, title: string}> = [];
    const today = new Date();
    
    for (let i = 1; i <= days; i++) { // Start from tomorrow
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // Skip weekends if desired
      // if (date.getDay() === 0 || date.getDay() === 6) continue;
      
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
  
  private getAppointmentData() {
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
      departments: [
        { id: 'sales', title: 'Sales Department' },
        { id: 'support', title: 'Customer Support' },
        { id: 'technical', title: 'Technical Support' },
        { id: 'billing', title: 'Billing & Accounts' }
      ],
      locations: [
        { id: 'new_york', title: 'New York Office' },
        { id: 'london', title: 'London Office' },
        { id: 'singapore', title: 'Singapore Office' },
        { id: 'remote', title: 'Remote/Online' }
      ],
      dates: this.generateAvailableDates(7),
      timeSlots: [
        { id: '09:00', title: '9:00 AM' },
        { id: '10:00', title: '10:00 AM' },
        { id: '11:00', title: '11:00 AM' },
        { id: '14:00', title: '2:00 PM' },
        { id: '15:00', title: '3:00 PM' },
        { id: '16:00', title: '4:00 PM' }
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
