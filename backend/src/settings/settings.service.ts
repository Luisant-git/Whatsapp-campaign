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
}
