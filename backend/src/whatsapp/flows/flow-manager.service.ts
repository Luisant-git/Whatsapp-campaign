import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../../tenant-prisma.service';
import { FlowHandler } from './flow-handler.interface';
import { AppointmentFlowHandler } from './appointment.flow';
import { FeedbackFlowHandler } from './feedback.flow';
import { LeadFlowHandler } from './lead.flow';

@Injectable()
export class FlowManagerService {
  private handlers: Map<string, FlowHandler> = new Map();

  constructor(
    private tenantPrisma: TenantPrismaService,
    private appointmentHandler: AppointmentFlowHandler,
    private feedbackHandler: FeedbackFlowHandler,
    private leadHandler: LeadFlowHandler,
  ) {
    // Register all flow handlers
    this.handlers.set('appointment', this.appointmentHandler);
    this.handlers.set('feedback', this.feedbackHandler);
    this.handlers.set('lead', this.leadHandler);
  }

  // Create flow session when flow starts
  async createFlowSession(flowId: string, contactPhone: string, tenantId: string, purpose: string): Promise<string> {
    const flowToken = `${purpose}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const prisma = await this.getTenantClient(parseInt(tenantId));
    
    await prisma.flowSession.create({
      data: {
        flowToken,
        flowId,
        contactPhone,
        tenantId,
        purpose,
        status: 'active',
        sessionData: {}
      }
    });

    return flowToken;
  }

  // Get flow session by token
  async getFlowSession(flowToken: string, tenantId: string) {
    const prisma = await this.getTenantClient(parseInt(tenantId));
    
    return prisma.flowSession.findUnique({
      where: { flowToken },
      include: { flow: true }
    });
  }

  // Update flow session
  async updateFlowSession(flowToken: string, tenantId: string, updates: any) {
    const prisma = await this.getTenantClient(parseInt(tenantId));
    
    return prisma.flowSession.update({
      where: { flowToken },
      data: {
        ...updates,
        updatedAt: new Date()
      }
    });
  }

  // Get initial data for flow
  async getFlowInitialData(purpose: string, data?: any): Promise<any> {
    const handler = this.handlers.get(purpose);
    if (!handler) {
      throw new Error(`No handler found for flow purpose: ${purpose}`);
    }

    return handler.getInitialData(data);
  }

  // Handle data exchange
  async handleFlowDataExchange(flowToken: string, screen: string, data: any, tenantId: string): Promise<any> {
    const session = await this.getFlowSession(flowToken, tenantId);
    if (!session) {
      throw new Error(`Flow session not found: ${flowToken}`);
    }

    const handler = this.handlers.get(session.purpose);
    if (!handler) {
      throw new Error(`No handler found for flow purpose: ${session.purpose}`);
    }

    // Update session with current screen
    await this.updateFlowSession(flowToken, tenantId, {
      currentScreen: screen,
      sessionData: { ...(session.sessionData as object || {}), ...data }
    });

    return handler.handleDataExchange(screen, data, session);
  }

  // Get flow by ID
  async getFlowById(flowId: string, tenantId: string) {
    const prisma = await this.getTenantClient(parseInt(tenantId));
    
    return prisma.whatsappFlow.findUnique({
      where: { flowId }
    });
  }

  // Register new flow
  async registerFlow(flowData: {
    name: string;
    flowId: string;
    purpose: string;
    description?: string;
    firstScreen?: string;
    triggerWords?: string[];
  }, tenantId: string) {
    const prisma = await this.getTenantClient(parseInt(tenantId));
    
    return prisma.whatsappFlow.create({
      data: {
        name: flowData.name,
        flowId: flowData.flowId,
        purpose: flowData.purpose,
        description: flowData.description,
        firstScreen: flowData.firstScreen || 'SCREEN',
        triggerWords: flowData.triggerWords || [],
        isActive: true
      }
    });
  }

  // Get all flows
  async getAllFlows(tenantId: string) {
    const prisma = await this.getTenantClient(parseInt(tenantId));
    
    return prisma.whatsappFlow.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  private async getTenantClient(tenantId: number) {
    // Use your existing tenant client logic
    const dbUrl = `postgresql://user:pass@localhost:5432/tenant_${tenantId}`;
    return this.tenantPrisma.getTenantClient(tenantId.toString(), dbUrl);
  }
}