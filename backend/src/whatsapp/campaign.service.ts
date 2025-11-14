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
    const campaign = await this.prisma.campaign.create({
      data: {
        name: createCampaignDto.name,
        templateName: createCampaignDto.templateName,
        parameters: createCampaignDto.parameters || undefined,
        totalCount: createCampaignDto.contacts.length,
        userId,
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

  async getCampaigns(userId: number) {
    return this.prisma.campaign.findMany({
      where: { userId },
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
    const updatedCampaign = await this.prisma.campaign.update({
      where: { id },
      data: {
        name: updateCampaignDto.name || campaign.name,
        templateName: updateCampaignDto.templateName || campaign.templateName,
        parameters: updateCampaignDto.parameters !== undefined ? updateCampaignDto.parameters : (campaign.parameters || undefined),
        totalCount: updateCampaignDto.contacts ? updateCampaignDto.contacts.length : campaign.totalCount,
        status: 'draft' // Reset status when editing
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

    for (const contact of campaign.contacts) {
      try {
        this.logger.log(`Sending campaign message to ${contact.phone}`);
        
        const result = await this.whatsappService.sendBulkTemplateMessageWithNames(
          [{ name: contact.name || '', phone: contact.phone }],
          campaign.templateName,
          userId
        );

        const messageResult = result[0];
        const status = messageResult.success ? 'sent' : 'failed';
        
        if (messageResult.success) {
          successCount++;
        } else {
          failedCount++;
        }

        // Store campaign message result
        await this.prisma.campaignMessage.create({
          data: {
            messageId: messageResult.messageId || null,
            phone: contact.phone,
            name: contact.name,
            status,
            error: messageResult.error || null,
            campaignId: id
          }
        });

        results.push({
          phone: contact.phone,
          name: contact.name,
          success: messageResult.success,
          messageId: messageResult.messageId,
          error: messageResult.error
        });

      } catch (error) {
        failedCount++;
        this.logger.error(`Failed to send to ${contact.phone}:`, error);
        
        await this.prisma.campaignMessage.create({
          data: {
            phone: contact.phone,
            name: contact.name,
            status: 'failed',
            error: error.message,
            campaignId: id
          }
        });

        results.push({
          phone: contact.phone,
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
}