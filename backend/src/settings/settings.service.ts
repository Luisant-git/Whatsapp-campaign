import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import { CentralPrismaService } from '../central-prisma.service';
import { WhatsAppSettingsDto, UpdateSettingsDto, SettingsResponseDto } from './dto/settings.dto';

@Injectable()
export class SettingsService {
  constructor(
    private tenantPrisma: TenantPrismaService,
    private centralPrisma: CentralPrismaService,
  ) {}

  private async getPrisma(userId: number) {
    const tenant = await this.centralPrisma.tenant.findUnique({
      where: { id: userId },
    });
    if (!tenant) throw new Error('Tenant not found');
    
    const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
    return this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);
  }

  async getAllSettings(userId: number): Promise<SettingsResponseDto[]> {
    const prisma = await this.getPrisma(userId);
    const settings = await prisma.whatsAppSettings.findMany({
      include: { masterConfig: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }]
    });

    return settings.map(s => ({
      id: s.id,
      name: s.name,
      templateName: s.templateName,
      phoneNumberId: s.masterConfig ? s.masterConfig.phoneNumberId : s.phoneNumberId,
      accessToken: s.masterConfig ? s.masterConfig.accessToken : (s.accessToken || ''),
      verifyToken: s.masterConfig ? s.masterConfig.verifyToken : (s.verifyToken || ''),
      apiUrl: s.apiUrl,
      language: s.language,
      headerImageUrl: s.headerImageUrl || undefined,
      isDefault: s.isDefault,
      masterConfigId: s.masterConfigId || undefined
    }));
  }

  async getSettings(userId: number): Promise<SettingsResponseDto> {
    const prisma = await this.getPrisma(userId);
    const settings = await prisma.whatsAppSettings.findFirst({
      where: { isDefault: true },
      include: { masterConfig: true }
    });

    if (!settings) {
      const firstSettings = await prisma.whatsAppSettings.findFirst({
        include: { masterConfig: true },
        orderBy: { createdAt: 'desc' }
      });

      if (!firstSettings) {
        throw new NotFoundException('No settings found');
      }

      return {
        id: firstSettings.id,
        name: firstSettings.name,
        templateName: firstSettings.templateName,
        phoneNumberId: firstSettings.masterConfig ? firstSettings.masterConfig.phoneNumberId : firstSettings.phoneNumberId,
        accessToken: firstSettings.masterConfig ? firstSettings.masterConfig.accessToken : (firstSettings.accessToken || ''),
        verifyToken: firstSettings.masterConfig ? firstSettings.masterConfig.verifyToken : (firstSettings.verifyToken || ''),
        apiUrl: firstSettings.apiUrl,
        language: firstSettings.language,
        headerImageUrl: firstSettings.headerImageUrl || undefined,
        isDefault: firstSettings.isDefault,
        masterConfigId: firstSettings.masterConfigId || undefined
      };
    }

    return {
      id: settings.id,
      name: settings.name,
      templateName: settings.templateName,
      phoneNumberId: settings.masterConfig ? settings.masterConfig.phoneNumberId : settings.phoneNumberId,
      accessToken: settings.masterConfig ? settings.masterConfig.accessToken : (settings.accessToken || ''),
      verifyToken: settings.masterConfig ? settings.masterConfig.verifyToken : (settings.verifyToken || ''),
      apiUrl: settings.apiUrl,
      language: settings.language,
      headerImageUrl: settings.headerImageUrl || undefined,
      isDefault: settings.isDefault,
      masterConfigId: settings.masterConfigId || undefined
    };
  }

  async getSettingsById(userId: number, id: number): Promise<SettingsResponseDto> {
    const prisma = await this.getPrisma(userId);
    const settings = await prisma.whatsAppSettings.findFirst({
      where: { id },
      include: { masterConfig: true }
    });

    if (!settings) {
      throw new NotFoundException('Settings not found');
    }

    return {
      id: settings.id,
      name: settings.name,
      templateName: settings.templateName,
      phoneNumberId: settings.masterConfig ? settings.masterConfig.phoneNumberId : settings.phoneNumberId,
      accessToken: settings.masterConfig ? settings.masterConfig.accessToken : (settings.accessToken || ''),
      verifyToken: settings.masterConfig ? settings.masterConfig.verifyToken : (settings.verifyToken || ''),
      apiUrl: settings.apiUrl,
      language: settings.language,
      headerImageUrl: settings.headerImageUrl || undefined,
      isDefault: settings.isDefault,
      masterConfigId: settings.masterConfigId || undefined
    };
  }

  async createSettings(userId: number, whatsAppSettingsDto: WhatsAppSettingsDto): Promise<SettingsResponseDto> {
    const prisma = await this.getPrisma(userId);
    const existingSettings = await prisma.whatsAppSettings.findFirst({
      where: { name: whatsAppSettingsDto.name }
    });

    if (existingSettings) {
      throw new ConflictException('Configuration with this name already exists');
    }

    if (whatsAppSettingsDto.isDefault) {
      await prisma.whatsAppSettings.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      });
    }

    const createData = { 
      ...whatsAppSettingsDto,
      apiUrl: whatsAppSettingsDto.apiUrl || 'https://graph.facebook.com/v18.0'
    };
    if (createData.masterConfigId && typeof createData.masterConfigId === 'string') {
      createData.masterConfigId = parseInt(createData.masterConfigId);
    }

    const settings = await prisma.whatsAppSettings.create({
      data: createData
    });

    // Create phone number mapping in central database
    await this.centralPrisma.phoneNumberMapping.upsert({
      where: { phoneNumberId: settings.phoneNumberId },
      update: { tenantId: userId },
      create: { phoneNumberId: settings.phoneNumberId, tenantId: userId }
    });

    return {
      id: settings.id,
      name: settings.name,
      templateName: settings.templateName,
      phoneNumberId: settings.phoneNumberId,
      accessToken: settings.accessToken || '',
      verifyToken: settings.verifyToken || '',
      apiUrl: settings.apiUrl,
      language: settings.language,
      headerImageUrl: settings.headerImageUrl || undefined,
      isDefault: settings.isDefault,
      masterConfigId: settings.masterConfigId || undefined
    };
  }

  async updateSettings(userId: number, id: number, updateSettingsDto: UpdateSettingsDto): Promise<SettingsResponseDto> {
    const prisma = await this.getPrisma(userId);
    const existingSettings = await prisma.whatsAppSettings.findFirst({
      where: { id }
    });

    if (!existingSettings) {
      throw new NotFoundException('Settings not found');
    }

    if (updateSettingsDto.name && updateSettingsDto.name !== existingSettings.name) {
      const nameExists = await prisma.whatsAppSettings.findFirst({
        where: { name: updateSettingsDto.name, id: { not: id } }
      });
      if (nameExists) {
        throw new ConflictException('Configuration with this name already exists');
      }
    }

    if (updateSettingsDto.isDefault) {
      await prisma.whatsAppSettings.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false }
      });
    }

    const updateData = { ...updateSettingsDto };
    if (updateData.masterConfigId && typeof updateData.masterConfigId === 'string') {
      updateData.masterConfigId = parseInt(updateData.masterConfigId);
    }

    const settings = await prisma.whatsAppSettings.update({
      where: { id },
      data: updateData
    });

    // Update phone number mapping if phoneNumberId changed
    if (updateSettingsDto.phoneNumberId) {
      await this.centralPrisma.phoneNumberMapping.upsert({
        where: { phoneNumberId: settings.phoneNumberId },
        update: { tenantId: userId },
        create: { phoneNumberId: settings.phoneNumberId, tenantId: userId }
      });
    }

    return {
      id: settings.id,
      name: settings.name,
      templateName: settings.templateName,
      phoneNumberId: settings.phoneNumberId,
      accessToken: settings.accessToken || '',
      verifyToken: settings.verifyToken || '',
      apiUrl: settings.apiUrl,
      language: settings.language,
      headerImageUrl: settings.headerImageUrl || undefined,
      isDefault: settings.isDefault,
      masterConfigId: settings.masterConfigId || undefined
    };
  }

  async deleteSettings(userId: number, id: number): Promise<void> {
    const prisma = await this.getPrisma(userId);
    const settings = await prisma.whatsAppSettings.findFirst({
      where: { id }
    });

    if (!settings) {
      throw new NotFoundException('Settings not found');
    }

    await prisma.whatsAppSettings.delete({ where: { id } });

    if (settings.isDefault) {
      const firstRemaining = await prisma.whatsAppSettings.findFirst({
        orderBy: { createdAt: 'desc' }
      });
      if (firstRemaining) {
        await prisma.whatsAppSettings.update({
          where: { id: firstRemaining.id },
          data: { isDefault: true }
        });
      }
    }
  }

  async setDefaultSettings(userId: number, id: number): Promise<SettingsResponseDto> {
    const prisma = await this.getPrisma(userId);
    const settings = await prisma.whatsAppSettings.findFirst({
      where: { id }
    });

    if (!settings) {
      throw new NotFoundException('Settings not found');
    }

    await prisma.whatsAppSettings.updateMany({
      where: { isDefault: true },
      data: { isDefault: false }
    });

    const updatedSettings = await prisma.whatsAppSettings.update({
      where: { id },
      data: { isDefault: true }
    });

    return {
      id: updatedSettings.id,
      name: updatedSettings.name,
      templateName: updatedSettings.templateName,
      phoneNumberId: updatedSettings.phoneNumberId,
      accessToken: updatedSettings.accessToken || '',
      verifyToken: updatedSettings.verifyToken || '',
      apiUrl: updatedSettings.apiUrl,
      language: updatedSettings.language,
      headerImageUrl: updatedSettings.headerImageUrl || undefined,
      isDefault: updatedSettings.isDefault,
      masterConfigId: updatedSettings.masterConfigId || undefined
    };
  }

  async getCurrentSettings(userId: number): Promise<WhatsAppSettingsDto | null> {
    const prisma = await this.getPrisma(userId);
    const settings = await prisma.whatsAppSettings.findFirst({
      where: { isDefault: true }
    });

    if (!settings) {
      const firstSettings = await prisma.whatsAppSettings.findFirst({
        orderBy: { createdAt: 'desc' }
      });
      
      return firstSettings ? {
        name: firstSettings.name || 'Default Config',
        templateName: firstSettings.templateName,
        phoneNumberId: firstSettings.phoneNumberId,
        accessToken: firstSettings.accessToken,
        verifyToken: firstSettings.verifyToken || undefined,
        apiUrl: firstSettings.apiUrl,
        language: firstSettings.language,
        isDefault: firstSettings.isDefault
      } : null;
    }

    return {
      name: settings.name || 'Default Config',
      templateName: settings.templateName,
      phoneNumberId: settings.phoneNumberId,
      accessToken: settings.accessToken,
      verifyToken: settings.verifyToken || undefined,
      apiUrl: settings.apiUrl,
      language: settings.language,
      isDefault: settings.isDefault
    };
  }

  async saveFeatureAssignments(userId: number, assignments: any): Promise<any> {
    const prisma = await this.getPrisma(userId);
    
    // Upsert feature assignments
    const existing = await prisma.featureAssignment.findFirst();
    
    if (existing) {
      await prisma.featureAssignment.update({
        where: { id: existing.id },
        data: {
          whatsappChat: assignments.whatsappChat || null,
          aiChatbot: assignments.aiChatbot || null,
          quickReply: assignments.quickReply || null,
          ecommerce: assignments.ecommerce || null,
          campaigns: assignments.campaigns || null
        }
      });
    } else {
      await prisma.featureAssignment.create({
        data: {
          whatsappChat: assignments.whatsappChat || null,
          aiChatbot: assignments.aiChatbot || null,
          quickReply: assignments.quickReply || null,
          ecommerce: assignments.ecommerce || null,
          campaigns: assignments.campaigns || null
        }
      });
    }

    // Return clean object
    return {
      success: true,
      assignments: {
        whatsappChat: assignments.whatsappChat || '',
        aiChatbot: assignments.aiChatbot || '',
        quickReply: assignments.quickReply || '',
        ecommerce: assignments.ecommerce || '',
        campaigns: assignments.campaigns || ''
      }
    };
  }

  async getFeatureAssignments(userId: number): Promise<any> {
    const prisma = await this.getPrisma(userId);
    
    const assignments = await prisma.featureAssignment.findFirst();

    if (!assignments) {
      return {
        whatsappChat: '',
        aiChatbot: '',
        quickReply: '',
        ecommerce: '',
        campaigns: ''
      };
    }

    return {
      whatsappChat: assignments.whatsappChat || '',
      aiChatbot: assignments.aiChatbot || '',
      quickReply: assignments.quickReply || '',
      ecommerce: assignments.ecommerce || '',
      campaigns: assignments.campaigns || ''
    };
  }

  async getMetaCatalogConfig(userId: number): Promise<any> {
    const prisma = await this.getPrisma(userId);
    
    try {
      const config = await prisma.metaCatalogConfig.findFirst();

      if (!config) {
        return {
          catalogId: '',
          accessToken: ''
        };
      }

      return {
        catalogId: config.catalogId || '',
        accessToken: config.accessToken || ''
      };
    } catch (error) {
      console.error('Error fetching meta catalog config:', error);
      return {
        catalogId: '',
        accessToken: ''
      };
    }
  }

  async saveMetaCatalogConfig(userId: number, config: any): Promise<any> {
    const prisma = await this.getPrisma(userId);
    
    const existing = await prisma.metaCatalogConfig.findFirst();
    
    if (existing) {
      await prisma.metaCatalogConfig.update({
        where: { id: existing.id },
        data: {
          catalogId: config.catalogId,
          accessToken: config.accessToken
        }
      });
    } else {
      await prisma.metaCatalogConfig.create({
        data: {
          catalogId: config.catalogId,
          accessToken: config.accessToken
        }
      });
    }

    return {
      success: true,
      config: {
        catalogId: config.catalogId,
        accessToken: config.accessToken
      }
    };
  }

  async fetchMetaCatalogs(userAccessToken: string): Promise<any> {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;

    if (!appId || !appSecret) {
      throw new Error('META_APP_ID or META_APP_SECRET is not configured in backend');
    }

    // 1. Exchange for long-lived user token
    const exchangeUrl = `https://graph.facebook.com/v20.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${userAccessToken}`;
    const exchangeRes = await fetch(exchangeUrl);
    if (!exchangeRes.ok) throw new Error('Failed to exchange user token for a permanent one');
    const exchangeData = await exchangeRes.json();
    const longLivedUserToken = exchangeData.access_token;

    // 2. Fetch Businesses
    const bizUrl = `https://graph.facebook.com/v20.0/me/businesses?access_token=${longLivedUserToken}`;
    const bizRes = await fetch(bizUrl);
    if (!bizRes.ok) throw new Error('Failed to fetch businesses. Ensure you granted business_management permissions.');
    const bizData = await bizRes.json();
    
    const catalogs: any[] = [];

    // 3. Fetch Catalogs for each Business
    for (const biz of (bizData.data || [])) {
      const catUrl = `https://graph.facebook.com/v20.0/${biz.id}/owned_product_catalogs?access_token=${longLivedUserToken}`;
      const catRes = await fetch(catUrl);
      if (catRes.ok) {
        const catData = await catRes.json();
        for (const cat of (catData.data || [])) {
          catalogs.push({
            id: cat.id,
            name: `${cat.name} (${biz.name})`,
          });
        }
      }
    }

    return {
      longLivedUserToken,
      catalogs
    };
  }
}