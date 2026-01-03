import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { WhatsAppSettingsDto, UpdateSettingsDto, SettingsResponseDto } from './dto/settings.dto';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getAllSettings(userId: number): Promise<SettingsResponseDto[]> {
    const settings = await this.prisma.whatsAppSettings.findMany({
      where: { userId },
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
    const settings = await this.prisma.whatsAppSettings.findFirst({
      where: { userId, isDefault: true },
      include: { masterConfig: true }
    });

    if (!settings) {
      const firstSettings = await this.prisma.whatsAppSettings.findFirst({
        where: { userId },
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
    const settings = await this.prisma.whatsAppSettings.findFirst({
      where: { id, userId },
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
    const existingSettings = await this.prisma.whatsAppSettings.findFirst({
      where: { userId, name: whatsAppSettingsDto.name }
    });

    if (existingSettings) {
      throw new ConflictException('Configuration with this name already exists');
    }

    if (whatsAppSettingsDto.isDefault) {
      await this.prisma.whatsAppSettings.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false }
      });
    }

    const createData = { 
      ...whatsAppSettingsDto, 
      userId,
      apiUrl: whatsAppSettingsDto.apiUrl || 'https://graph.facebook.com/v18.0'
    };
    if (createData.masterConfigId && typeof createData.masterConfigId === 'string') {
      createData.masterConfigId = parseInt(createData.masterConfigId);
    }

    const settings = await this.prisma.whatsAppSettings.create({
      data: createData
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
    const existingSettings = await this.prisma.whatsAppSettings.findFirst({
      where: { id, userId }
    });

    if (!existingSettings) {
      throw new NotFoundException('Settings not found');
    }

    if (updateSettingsDto.name && updateSettingsDto.name !== existingSettings.name) {
      const nameExists = await this.prisma.whatsAppSettings.findFirst({
        where: { userId, name: updateSettingsDto.name, id: { not: id } }
      });
      if (nameExists) {
        throw new ConflictException('Configuration with this name already exists');
      }
    }

    if (updateSettingsDto.isDefault) {
      await this.prisma.whatsAppSettings.updateMany({
        where: { userId, isDefault: true, id: { not: id } },
        data: { isDefault: false }
      });
    }

    const updateData = { ...updateSettingsDto };
    if (updateData.masterConfigId && typeof updateData.masterConfigId === 'string') {
      updateData.masterConfigId = parseInt(updateData.masterConfigId);
    }

    const settings = await this.prisma.whatsAppSettings.update({
      where: { id },
      data: updateData
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

  async deleteSettings(userId: number, id: number): Promise<void> {
    const settings = await this.prisma.whatsAppSettings.findFirst({
      where: { id, userId }
    });

    if (!settings) {
      throw new NotFoundException('Settings not found');
    }

    await this.prisma.whatsAppSettings.delete({ where: { id } });

    if (settings.isDefault) {
      const firstRemaining = await this.prisma.whatsAppSettings.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });
      if (firstRemaining) {
        await this.prisma.whatsAppSettings.update({
          where: { id: firstRemaining.id },
          data: { isDefault: true }
        });
      }
    }
  }

  async setDefaultSettings(userId: number, id: number): Promise<SettingsResponseDto> {
    const settings = await this.prisma.whatsAppSettings.findFirst({
      where: { id, userId }
    });

    if (!settings) {
      throw new NotFoundException('Settings not found');
    }

    await this.prisma.whatsAppSettings.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false }
    });

    const updatedSettings = await this.prisma.whatsAppSettings.update({
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
    const settings = await this.prisma.whatsAppSettings.findFirst({
      where: { userId, isDefault: true }
    });

    if (!settings) {
      const firstSettings = await this.prisma.whatsAppSettings.findFirst({
        where: { userId },
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