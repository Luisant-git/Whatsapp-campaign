import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { WhatsAppSettingsDto, UpdateSettingsDto, SettingsResponseDto } from './dto/settings.dto';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings(userId: number): Promise<SettingsResponseDto> {
    const settings = await this.prisma.whatsAppSettings.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    if (!settings) {
      // Return default settings if none exist
      return {
        templateName: 'luisant_diwali_website50_v1',
        phoneNumberId: '',
        accessToken: '',
        verifyToken: '',
        apiUrl: 'https://graph.facebook.com/v18.0',
        language: 'en'
      };
    }

    return {
      templateName: settings.templateName,
      phoneNumberId: settings.phoneNumberId,
      accessToken: settings.accessToken || '',
      verifyToken: settings.verifyToken || '',
      apiUrl: settings.apiUrl,
      language: settings.language
    };
  }

  async updateSettings(userId: number, updateSettingsDto: UpdateSettingsDto): Promise<SettingsResponseDto> {
    const existingSettings = await this.prisma.whatsAppSettings.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    let settings;
    if (existingSettings) {
      settings = await this.prisma.whatsAppSettings.update({
        where: { id: existingSettings.id },
        data: {
          ...updateSettingsDto,
          updatedAt: new Date()
        }
      });
    } else {
      settings = await this.prisma.whatsAppSettings.create({
        data: {
          templateName: updateSettingsDto.templateName || 'luisant_diwali_website50_v1',
          phoneNumberId: updateSettingsDto.phoneNumberId || '',
          accessToken: updateSettingsDto.accessToken || '',
          verifyToken: updateSettingsDto.verifyToken || '',
          apiUrl: updateSettingsDto.apiUrl || 'https://graph.facebook.com/v18.0',
          language: updateSettingsDto.language || 'en',
          userId
        }
      });
    }

    return {
      templateName: settings.templateName,
      phoneNumberId: settings.phoneNumberId,
      accessToken: settings.accessToken || '',
      verifyToken: settings.verifyToken || '',
      apiUrl: settings.apiUrl,
      language: settings.language
    };
  }

  async createSettings(userId: number, whatsAppSettingsDto: WhatsAppSettingsDto): Promise<SettingsResponseDto> {
    const settings = await this.prisma.whatsAppSettings.create({
      data: { ...whatsAppSettingsDto, userId }
    });

    return {
      templateName: settings.templateName,
      phoneNumberId: settings.phoneNumberId,
      accessToken: settings.accessToken || '',
      verifyToken: settings.verifyToken || '',
      apiUrl: settings.apiUrl,
      language: settings.language
    };
  }

  async getCurrentSettings(userId: number): Promise<WhatsAppSettingsDto | null> {
    const settings = await this.prisma.whatsAppSettings.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    return settings ? {
      templateName: settings.templateName,
      phoneNumberId: settings.phoneNumberId,
      accessToken: settings.accessToken,
      verifyToken: settings.verifyToken || undefined,
      apiUrl: settings.apiUrl,
      language: settings.language
    } : null;
  }
}