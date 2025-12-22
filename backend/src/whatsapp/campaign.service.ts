import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { WhatsappService } from './whatsapp.service';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/campaign.dto';

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);

  constructor(
    private prisma: PrismaService,
    private whatsappService: WhatsappService
  ) {}

  async createCampaign(createCampaignDto: CreateCampaignDto, userId: number) {
    const scheduleType = createCampaignDto.scheduleType || 'one-time';
    const status = scheduleType === 'time-based' ? 'scheduled' : 'draft';

    // Find settings by template name to get settingsId
    const settings = await this.prisma.whatsAppSettings.findFirst({
      where: {
        templateName: createCampaignDto.templateName,
        userId
      }
    });

    if (!settings) {
      throw new Error(`No WhatsApp settings found for template: ${createCampaignDto.templateName}`);
    }

    const campaign = await this.prisma.campaign.create({
      data: {
        name: createCampaignDto.name,
        templateName: createCampaignDto.templateName,
        parameters: createCampaignDto.parameters || undefined,
        totalCount: createCampaignDto.contacts.length,
        scheduleType,
        scheduledDays: createCampaignDto.scheduledDays || [],
        scheduledTime: createCampaignDto.scheduledTime,
        status,
        userId,
        settingsId: settings.id,
        contacts: {
          create: createCampaignDto.contacts.map(contact => ({
            name: contact.name,
            phone: contact.phone
          }))
        }
      },
      include: {
        contacts: true
      }
    });

    return campaign;
  }

  async getCampaigns(userId: number, settingsName?: string) {
    const whereClause: any = { userId };
    
    // If settingsName is provided, find the associated template and filter by it
    if (settingsName) {
      const settings = await this.prisma.whatsAppSettings.findFirst({
        where: { name: settingsName }
      });
      
      if (settings) {
        whereClause.templateName = settings.templateName;
      } else {
        // Return empty if no settings found for this name
        return [];
      }
    }
    
    return this.prisma.campaign.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            contacts: true,
            messages: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getCampaign(id: number, userId: number) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, userId },
      include: {
        contacts: true,
        messages: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return campaign;
  }

  async updateCampaign(id: number, updateCampaignDto: UpdateCampaignDto, userId: number) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, userId }
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // Update campaign details
    const scheduleType = updateCampaignDto.scheduleType || campaign.scheduleType;
    const status = scheduleType === 'time-based' ? 'scheduled' : 'draft';

    const updatedCampaign = await this.prisma.campaign.update({
      where: { id },
      data: {
        name: updateCampaignDto.name || campaign.name,
        templateName: updateCampaignDto.templateName || campaign.templateName,
        parameters: updateCampaignDto.parameters !== undefined ? updateCampaignDto.parameters : (campaign.parameters || undefined),
        totalCount: updateCampaignDto.contacts ? updateCampaignDto.contacts.length : campaign.totalCount,
        scheduleType,
        scheduledDays: updateCampaignDto.scheduledDays !== undefined ? updateCampaignDto.scheduledDays : campaign.scheduledDays,
        scheduledTime: updateCampaignDto.scheduledTime !== undefined ? updateCampaignDto.scheduledTime : campaign.scheduledTime,
        status
      }
    });

    // Update contacts if provided
    if (updateCampaignDto.contacts) {
      // Delete existing contacts
      await this.prisma.campaignContact.deleteMany({
        where: { campaignId: id }
      });

      // Create new contacts
      await this.prisma.campaignContact.createMany({
        data: updateCampaignDto.contacts.map(contact => ({
          name: contact.name,
          phone: contact.phone,
          campaignId: id
        }))
      });
    }

    return this.getCampaign(id, userId);
  }

  async runCampaign(id: number, userId: number) {
    const campaign = await this.getCampaign(id, userId);

    // Update campaign status to running
    await this.prisma.campaign.update({
      where: { id },
      data: { 
        status: 'running',
        successCount: 0,
        failedCount: 0
      }
    });

    // Clear previous campaign messages for rerun
    await this.prisma.campaignMessage.deleteMany({
      where: { campaignId: id }
    });

    const results: Array<{ phone: string; name: string | null; success: boolean; messageId?: string; error?: string }> = [];
    let successCount = 0;
    let failedCount = 0;

    // Get settings to access headerImageUrl
    const settings = await this.prisma.whatsAppSettings.findUnique({ 
      where: { id: campaign.settingsId } 
    });

    for (const contact of campaign.contacts) {
      try {
        this.logger.log(`Sending campaign message to ${contact.phone}`);
        
        const result = await this.whatsappService.sendBulkTemplateMessageWithNames(
          [{ name: contact.name || '', phone: contact.phone }],
          campaign.templateName,
          userId,
          campaign.settingsId,
          settings?.headerImageUrl || undefined
        );

        const messageResult = result[0];
        const status = messageResult.success ? 'sent' : 'failed';
        
        if (messageResult.success) {
          successCount++;
        } else {
          failedCount++;
        }

        // Store campaign message result with formatted phone number
        const formattedPhone = messageResult.phoneNumber || contact.phone;
        await this.prisma.campaignMessage.create({
          data: {
            messageId: messageResult.messageId || null,
            phone: formattedPhone,
            name: contact.name,
            status,
            error: messageResult.error || null,
            campaignId: id
          }
        });

        results.push({
          phone: formattedPhone,
          name: contact.name,
          success: messageResult.success,
          messageId: messageResult.messageId,
          error: messageResult.error
        });

      } catch (error) {
        failedCount++;
        this.logger.error(`Failed to send to ${contact.phone}:`, error);
        
        // Use formatted phone for failed messages too
        const formattedPhone = this.formatPhoneNumber(contact.phone);
        await this.prisma.campaignMessage.create({
          data: {
            phone: formattedPhone,
            name: contact.name,
            status: 'failed',
            error: error.message,
            campaignId: id
          }
        });

        results.push({
          phone: formattedPhone,
          name: contact.name,
          success: false,
          error: error.message
        });
      }
    }

    // Update final campaign status and counts
    await this.prisma.campaign.update({
      where: { id },
      data: {
        status: 'completed',
        successCount,
        failedCount
      }
    });

    return {
      campaignId: id,
      totalSent: results.length,
      successCount,
      failedCount,
      results
    };
  }

  async deleteCampaign(id: number, userId: number) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, userId }
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    await this.prisma.campaign.delete({
      where: { id }
    });

    return { message: 'Campaign deleted successfully' };
  }

  async getCampaignResults(id: number, userId: number) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // Get response data for each contact
    const results = await Promise.all(
      campaign.messages.map(async (message) => {
        // Check if customer responded after the campaign message was sent
        // Try different phone number formats to handle potential mismatches
        const cleanPhone = message.phone.replace(/[^0-9]/g, '');
        const phoneVariations = [
          message.phone, // Original format
          cleanPhone, // Digits only
          `+${cleanPhone}`, // With + prefix
          cleanPhone.length === 10 && /^[6-9]/.test(cleanPhone) ? `91${cleanPhone}` : cleanPhone, // Add India code if 10 digits
          cleanPhone.startsWith('91') ? cleanPhone.substring(2) : cleanPhone // Remove India code if present
        ].filter((phone, index, arr) => arr.indexOf(phone) === index); // Remove duplicates

        this.logger.log(`Checking responses for campaign message to ${message.phone}, variations: ${phoneVariations.join(', ')}`);

        // Debug: Check all incoming messages for this user
        const allIncoming = await this.prisma.whatsAppMessage.findMany({
          where: {
            userId,
            direction: 'incoming',
            createdAt: {
              gte: message.createdAt
            }
          },
          select: { from: true, message: true, createdAt: true }
        });
        this.logger.log(`All incoming messages since campaign: ${JSON.stringify(allIncoming)}`);

        const responses = await this.prisma.whatsAppMessage.findMany({
          where: {
            from: { in: phoneVariations },
            userId,
            direction: 'incoming',
            createdAt: {
              gte: message.createdAt
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        });

        this.logger.log(`Found ${responses.length} responses for ${message.phone}`);
        if (responses.length > 0) {
          this.logger.log(`Response from: ${responses[0].from}, message: ${responses[0].message}`);
        }

        const lastResponse = responses[0] || null;

        return {
          name: message.name,
          phone: message.phone,
          status: message.status,
          createdAt: message.createdAt,
          hasResponse: !!lastResponse,
          lastResponse: lastResponse ? {
            message: lastResponse.message,
            createdAt: lastResponse.createdAt
          } : null
        };
      })
    );

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        templateName: campaign.templateName,
        createdAt: campaign.createdAt,
        status: campaign.status
      },
      results
    };
  }

  async downloadCampaignResults(id: number, userId: number, format: 'csv' | 'xlsx') {
    const { campaign, results } = await this.getCampaignResults(id, userId);
    
    const data = results.map(result => ({
      'Contact Name': result.name || 'N/A',
      'Phone Number': result.phone,
      'Status': result.status,
      'Sent At': result.createdAt.toISOString(),
      'Has Response': result.hasResponse ? 'Yes' : 'No',
      'Last Response': result.lastResponse?.message || 'No response',
      'Response Time': result.lastResponse?.createdAt?.toISOString() || 'N/A'
    }));

    if (format === 'csv') {
      const csv = this.convertToCSV(data);
      return {
        data: csv,
        filename: `campaign-${campaign.name}-results.csv`,
        contentType: 'text/csv'
      };
    } else {
      // For Excel format, you would need to install xlsx package
      // For now, return CSV format
      const csv = this.convertToCSV(data);
      return {
        data: csv,
        filename: `campaign-${campaign.name}-results.csv`,
        contentType: 'text/csv'
      };
    }
  }

  private formatPhoneNumber(phone: string): string {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    
    // If phone number is 10 digits and starts with 6-9, add India country code
    if (cleanPhone.length === 10 && /^[6-9]/.test(cleanPhone)) {
      return `91${cleanPhone}`;
    }
    
    // If already has country code, return as is
    return cleanPhone;
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes in CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');
    
    return csvContent;
  }
}