import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import { TenantContext } from '../tenant/tenant.decorator';
import { CreateMasterConfigDto, UpdateMasterConfigDto } from './dto/master-config.dto';

@Injectable()
export class MasterConfigService {
  constructor(private tenantPrisma: TenantPrismaService) {}

  private getPrisma(ctx: TenantContext) {
    return this.tenantPrisma.getTenantClient(ctx.tenantId, ctx.dbUrl);
  }

  async create(createDto: CreateMasterConfigDto, tenantContext: TenantContext) {
    const prisma = this.getPrisma(tenantContext);
    return prisma.masterConfig.create({
      data: {
        ...createDto,
        isActive: createDto.isActive ?? true,
      },
    });
  }

  async findAll(tenantContext: TenantContext) {
    const prisma = this.getPrisma(tenantContext);
    return prisma.masterConfig.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, tenantContext: TenantContext) {
    const prisma = this.getPrisma(tenantContext);
    return prisma.masterConfig.findUnique({
      where: { id },
    });
  }

  async update(id: number, updateDto: UpdateMasterConfigDto, tenantContext: TenantContext) {
    const prisma = this.getPrisma(tenantContext);
    return prisma.masterConfig.update({
      where: { id },
      data: updateDto,
    });
  }

  async remove(id: number, tenantContext: TenantContext) {
    const prisma = this.getPrisma(tenantContext);
    return prisma.masterConfig.delete({
      where: { id },
    });
  }

  async saveFeatureAssignments(assignments: any, tenantContext: TenantContext) {
    const prisma = this.getPrisma(tenantContext);
    const existing = await prisma.featureAssignment.findFirst();

    if (existing) {
      return prisma.featureAssignment.update({
        where: { id: existing.id },
        data: {
          whatsappChat: assignments.whatsappChat || null,
          aiChatbot: assignments.aiChatbot || null,
          quickReply: assignments.quickReply || null,
          ecommerce: assignments.ecommerce || null,
        },
      });
    }

    return prisma.featureAssignment.create({
      data: {
        whatsappChat: assignments.whatsappChat || null,
        aiChatbot: assignments.aiChatbot || null,
        quickReply: assignments.quickReply || null,
        ecommerce: assignments.ecommerce || null,
      },
    });
  }

  async getFeatureAssignments(tenantContext: TenantContext) {
    const prisma = this.getPrisma(tenantContext);
    const assignment = await prisma.featureAssignment.findFirst();

    return assignment || {
      whatsappChat: '',
      aiChatbot: '',
      quickReply: '',
      ecommerce: '',
    };
  }

  async subscribeToWABA(id: number, tenantContext: TenantContext) {
    const prisma = this.getPrisma(tenantContext);
    
    // Get the master config
    const config = await prisma.masterConfig.findUnique({
      where: { id },
    });

    if (!config) {
      throw new BadRequestException('Master config not found');
    }

    if (!config.wabaId || !config.accessToken) {
      throw new BadRequestException('WABA ID and Access Token are required');
    }

    // Subscribe app to WABA
    const subscribeUrl = `https://graph.facebook.com/v18.0/${config.wabaId}/subscribed_apps`;
    
    try {
      const response = await fetch(subscribeUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new BadRequestException(
          error.error?.message || 'Failed to subscribe to WABA'
        );
      }

      const data = await response.json();
      return {
        success: true,
        message: 'Successfully subscribed app to WABA. Webhooks are now active.',
        data,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to subscribe to WABA: ${error.message}`
      );
    }
  }
}