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

  async handleEmbeddedSignup(code: string, tenantContext: TenantContext) {
    const prisma = this.getPrisma(tenantContext);
    
    // Read Meta App credentials from environment variables
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    const verifyToken = process.env.META_VERIFY_TOKEN || 'default_verify_token';

    if (!appId || !appSecret) {
      throw new BadRequestException('META_APP_ID or META_APP_SECRET is not configured in the server environment');
    }

    // 1. Exchange the code for a System User Access Token
    const tokenResponse = await fetch(`https://graph.facebook.com/v20.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${code}`);
    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      throw new BadRequestException(error.error?.message || 'Failed to exchange code for access token');
    }
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch granular scopes using debug_token to get WABA ID
    const debugResponse = await fetch(`https://graph.facebook.com/v20.0/debug_token?input_token=${accessToken}&access_token=${appId}|${appSecret}`);
    if (!debugResponse.ok) {
      const error = await debugResponse.json();
      throw new BadRequestException(error.error?.message || 'Failed to verify access token');
    }
    const debugData = await debugResponse.json();
    
    const granularScopes = debugData.data?.granular_scopes || [];
    
    // Extract WABA ID from the messaging scope
    const messagingScope = granularScopes.find((scope: any) => scope.scope === 'whatsapp_business_messaging');
    const wabaId = messagingScope?.target_ids?.[0];

    if (!wabaId) {
      throw new BadRequestException('Could not retrieve WABA ID. Please ensure you selected a Business Account during signup.');
    }

    // 3. Fetch Phone Number ID associated with the WABA
    let phoneNumberId = '';
    const phoneResponse = await fetch(`https://graph.facebook.com/v20.0/${wabaId}/phone_numbers?access_token=${accessToken}`);
    if (phoneResponse.ok) {
      const phoneData = await phoneResponse.json();
      if (phoneData.data && phoneData.data.length > 0) {
        phoneNumberId = phoneData.data[0].id;
      }
    }

    if (!phoneNumberId) {
      throw new BadRequestException('Could not retrieve a Phone Number ID. Ensure a phone number is linked to the selected Business Account.');
    }

    // 4. Create master config in the database
    return prisma.masterConfig.create({
      data: {
        name: `Meta Connect - ${phoneNumberId}`,
        phoneNumberId,
        wabaId,
        appId,
        accessToken,
        verifyToken,
        isActive: true,
      }
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

  async setAppWebhook(id: number, callbackUrl: string, tenantContext: TenantContext) {
    const prisma = this.getPrisma(tenantContext);
    
    // Get the master config
    const config = await prisma.masterConfig.findUnique({
      where: { id },
    });

    if (!config) {
      throw new BadRequestException('Master config not found');
    }

    if (!config.verifyToken) {
      throw new BadRequestException('Verify Token is required in the configuration');
    }

    const appId = config.appId || process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;

    if (!appId || !appSecret) {
      throw new BadRequestException('Meta App ID and App Secret must be configured');
    }

    // Set Webhook for App
    const subscribeUrl = `https://graph.facebook.com/v20.0/${appId}/subscriptions`;
    
    // Prepare url parameters
    const params = new URLSearchParams({
      object: 'whatsapp_business_account',
      callback_url: callbackUrl,
      verify_token: config.verifyToken,
      fields: 'messages',
      access_token: `${appId}|${appSecret}`
    });
    
    try {
      const response = await fetch(subscribeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
      });

      if (!response.ok) {
        const error = await response.json();
        throw new BadRequestException(
          error.error?.message || 'Failed to set app webhook'
        );
      }

      const data = await response.json();
      return {
        success: true,
        message: 'Successfully configured App Webhook URL in Meta.',
        data,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to set app webhook: ${error.message}`
      );
    }
  }
}