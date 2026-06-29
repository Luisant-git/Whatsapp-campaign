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
  ) { }
  async createCampaign(createCampaignDto: CreateCampaignDto, userId: number) {
    const scheduleType = createCampaignDto.scheduleType || 'one-time';
    const status = scheduleType === 'time-based' ? 'scheduled' : 'draft';

    // 1. Get WhatsApp settings
    const settings = await this.prisma.whatsAppSettings.findFirst({
      where: {
        templateName: createCampaignDto.templateName,
      },
    });

    if (!settings) {
      throw new Error(
        `No WhatsApp settings found for template: ${createCampaignDto.templateName}`,
      );
    }

    // 2. Build base data object
    const data: any = {
      name: createCampaignDto.name,
      templateName: createCampaignDto.templateName,
      parameters: createCampaignDto.parameters || undefined,
      totalCount: createCampaignDto.contacts.length,
      scheduleType,
      scheduledDays: createCampaignDto.scheduledDays || [],
      scheduledTime: createCampaignDto.scheduledTime,
      status,
      settings: { connect: { id: settings.id } },
      contacts: {
        create: createCampaignDto.contacts.map(contact => ({
          name: contact.name,
          phone: contact.phone,
        })),
      },
    };

    // 3. If groupId is provided, validate and attach group relation
    if (createCampaignDto.groupId) {
      const group = await this.prisma.group.findFirst({
        where: { id: createCampaignDto.groupId },
      });

      if (!group) {
        throw new Error(
          `Group ID ${createCampaignDto.groupId} not found for this user.`,
        );
      }

      data.group = { connect: { id: createCampaignDto.groupId } };
    }

    // 4. Create campaign
    const campaign = await this.prisma.campaign.create({
      data,
      include: {
        contacts: true,
        group: true,
      },
    });

    return campaign;
  }
  async getCampaign(id: number, userId: number) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id },
      include: {
        contacts: true,
        messages: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  async getCampaigns(userId: number, settingsName?: string) {
    return this.prisma.campaign.findMany({
      where: {
        ...(settingsName ? { settings: { templateName: settingsName } } : {}),
      },
      include: {
        contacts: true,
        group: true,
        settings: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateCampaign(id: number, updateCampaignDto: UpdateCampaignDto, userId: number) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id }
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

    let successCount = 0;
    let failedCount = 0;

    // Get settings to access headerImageUrl
    const settings = await this.prisma.whatsAppSettings.findUnique({
      where: { id: campaign.settingsId }
    });

    const contactsToSend = campaign.contacts || [];

    this.logger.log(
      `Campaign ${id}: Processing ${contactsToSend.length} contacts in batches`
    );

    // Process in batches of 50 to avoid overwhelming the system
    const BATCH_SIZE = 50;
    const batches: typeof contactsToSend[] = [];
    for (let i = 0; i < contactsToSend.length; i += BATCH_SIZE) {
      batches.push(contactsToSend.slice(i, i + BATCH_SIZE));
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      this.logger.log(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} contacts)`);

      // Process batch contacts sequentially via whatsappService to avoid DB pool exhaustion and rate limits
      const batchContacts = batch.map(contact => ({ name: contact.name || '', phone: contact.phone }));
      
      let results: Array<{ phoneNumber: string; success: boolean; messageId?: string; error?: string }> = [];
      try {
        results = await this.whatsappService.sendBulkTemplateMessageWithNames(
          batchContacts,
          campaign.templateName,
          userId,
          campaign.settingsId,
          settings?.headerImageUrl && settings.headerImageUrl.trim() !== '' ? settings.headerImageUrl : undefined
        );
      } catch (error) {
        this.logger.error(`Failed to process batch ${batchIndex + 1}:`, error);
        results = batchContacts.map(contact => ({
          phoneNumber: this.formatPhoneNumber(contact.phone),
          success: false,
          error: error.message || 'Batch processing failed'
        }));
      }

      // Format results to match the expected batchResults structure
      const batchResults = results.map(result => {
        const contact = batch.find(c => this.formatPhoneNumber(c.phone) === result.phoneNumber || c.phone === result.phoneNumber) || { name: '', phone: result.phoneNumber };
        return {
          status: 'fulfilled' as const,
          value: {
            success: result.success,
            messageId: result.messageId || null,
            phone: result.phoneNumber,
            name: contact.name,
            status: result.success ? 'sent' : 'failed',
            error: result.error || null
          }
        };
      });

      // Process batch results and save to database
      const messagesToCreate: Array<{
        messageId: string | null;
        phone: string;
        name: string | null;
        status: string;
        error: string | null;
        campaignId: number;
      }> = [];
      const contactsToUpsert: Array<{
        phone: string;
        name: string;
        phoneNumberId: string | null;
        groupId: number | null;
      }> = [];

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          const data = result.value;
          
          if (data.success) {
            successCount++;
          } else {
            failedCount++;
          }

          messagesToCreate.push({
            messageId: data.messageId || null,
            phone: data.phone,
            name: data.name,
            status: data.status,
            error: data.error,
            campaignId: id
          });

          // Prepare contact for upsert
          contactsToUpsert.push({
            phone: data.phone,
            name: data.name || 'Unknown',
            phoneNumberId: settings?.phoneNumberId || null,
            groupId: campaign.groupId
          });
        }
      }

      // Bulk insert campaign messages
      if (messagesToCreate.length > 0) {
        await this.prisma.campaignMessage.createMany({
          data: messagesToCreate
        });
      }

      // Batch fetch existing contacts for this batch
      const batchPhones = contactsToUpsert.map(c => c.phone);
      const existingContacts = await this.prisma.contact.findMany({
        where: { phone: { in: batchPhones } },
        select: { id: true, phone: true, name: true, groupId: true },
      });
      const existingContactMap = new Map(existingContacts.map(c => [c.phone, c]));

      for (const contactData of contactsToUpsert) {
        try {
          const existing = existingContactMap.get(contactData.phone);
          if (existing) {
            const keepName = existing.name &&
              !['null', 'undefined', 'unknown'].includes(existing.name.trim().toLowerCase())
                ? existing.name : contactData.name;
            await this.prisma.contact.update({
              where: { id: existing.id },
              data: { name: keepName, lastMessageDate: new Date(), groupId: contactData.groupId || existing.groupId, isActive: true },
            });
          } else {
            await this.prisma.contact.create({
              data: { phone: contactData.phone, name: contactData.name, phoneNumberId: contactData.phoneNumberId, lastMessageDate: new Date(), groupId: contactData.groupId, isActive: true },
            });
          }
        } catch (contactError) {
          this.logger.warn(`Failed to update contact ${contactData.phone}:`, contactError.message);
        }
      }


      this.logger.log(`Batch ${batchIndex + 1} completed. Success: ${successCount}, Failed: ${failedCount}`);
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

    this.logger.log(`Campaign ${id} completed. Total Success: ${successCount}, Total Failed: ${failedCount}`);

    return {
      campaignId: id,
      totalContacts: contactsToSend.length,
      successCount,
      failedCount
    };
  }

  // async runCampaign(id: number, userId: number) {
  //   const campaign = await this.getCampaign(id, userId);

  //   // Mark campaign running
  //   await this.prisma.campaign.update({
  //     where: { id },
  //     data: { status: 'running', successCount: 0, failedCount: 0 },
  //   });

  //   // Clear previous results (if re‑run)
  //   await this.prisma.campaignMessage.deleteMany({ where: { campaignId: id } });

  //   const results: Array<{ phone: string; name: string | null; success: boolean; messageId?: string; error?: string }> = [];
  //   let successCount = 0;
  //   let failedCount = 0;

  //   const settings = await this.prisma.whatsAppSettings.findUnique({
  //     where: { id: campaign.settingsId },
  //   });

  //   for (const contact of campaign.contacts) {
  //     try {
  //       this.logger.log(`Sending campaign message to ${contact.phone}`);

  //       // 👇 Footer text that will appear for every recipient
  //       const footerText =
  //         '\n\nIf you’re interested, reply YES.\nTo stop receiving messages, reply STOP.';

  //       // Skip contacts already in blocklist label (optional safeguard)
  //       const label = await this.prisma.chatLabel.findUnique({
  //         where: { phone_userId: { phone: contact.phone, userId } },
  //         select: { labels: true },
  //       });
  //       if (label?.labels?.includes('blocklist')) {
  //         this.logger.log(`Skipping ${contact.phone} - currently in blocklist`);
  //         continue;
  //       }

  //       // ✅ Use correct template name + pass footerText separately
  //       const result = await this.whatsappService.sendBulkTemplateMessageWithNames(
  //         [{ name: contact.name || '', phone: contact.phone }],
  //         campaign.templateName,     // official template name registered in Meta
  //         userId,
  //         campaign.settingsId,
  //         settings?.headerImageUrl?.trim() || undefined,
  //         footerText                 // 👈 this is rendered in the message body
  //       );

  //       const messageResult = result[0];
  //       const status = messageResult.success ? 'sent' : 'failed';
  //       if (messageResult.success) successCount++;
  //       else failedCount++;

  //       const formattedPhone = messageResult.phoneNumber || contact.phone;

  //       // Record each message outcome
  //       await this.prisma.campaignMessage.create({
  //         data: {
  //           messageId: messageResult.messageId || null,
  //           phone: formattedPhone,
  //           name: contact.name,
  //           status,
  //           error: messageResult.error || null,
  //           campaignId: id,
  //         },
  //       });

  //       // Upsert contact so it remains tracked
  //       await this.prisma.contact.upsert({
  //         where: { phone_userId: { phone: formattedPhone, userId } },
  //         update: {
  //           name: contact.name || 'Unknown',
  //           lastMessageDate: new Date(),
  //           groupId: campaign.groupId,
  //         },
  //         create: {
  //           phone: formattedPhone,
  //           name: contact.name || 'Unknown',
  //           lastMessageDate: new Date(),
  //           groupId: campaign.groupId,
  //           userId,
  //         },
  //       });

  //       // Store success/failed in response list
  //       results.push({
  //         phone: formattedPhone,
  //         name: contact.name,
  //         success: messageResult.success,
  //         messageId: messageResult.messageId,
  //         error: messageResult.error,
  //       });
  //     } catch (error) {
  //       failedCount++;
  //       this.logger.error(`Failed to send to ${contact.phone}:`, error);

  //       const formattedPhone = this.formatPhoneNumber(contact.phone);
  //       await this.prisma.campaignMessage.create({
  //         data: {
  //           phone: formattedPhone,
  //           name: contact.name,
  //           status: 'failed',
  //           error: error.message,
  //           campaignId: id,
  //         },
  //       });

  //       results.push({
  //         phone: formattedPhone,
  //         name: contact.name,
  //         success: false,
  //         error: error.message,
  //       });
  //     }
  //   }

  //   // Mark campaign complete
  //   await this.prisma.campaign.update({
  //     where: { id },
  //     data: { status: 'completed', successCount, failedCount },
  //   });

  //   return {
  //     campaignId: id,
  //     totalSent: results.length,
  //     successCount,
  //     failedCount,
  //     results,
  //   };
  // }

  async deleteCampaign(id: number, userId: number) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id }
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
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const messages = campaign.messages || [];

    // Build all phone variations for all messages in one pass
    const earliestDate = messages.reduce((min, m) => m.createdAt < min ? m.createdAt : min, messages[0]?.createdAt || new Date());
    const allPhoneVariations = new Set<string>();
    const phoneVariationMap = new Map<string, string>(); // variation -> original phone

    for (const message of messages) {
      const cleanPhone = message.phone.replace(/[^0-9]/g, '');
      const variations = [
        message.phone,
        cleanPhone,
        `+${cleanPhone}`,
        cleanPhone.length === 10 && /^[6-9]/.test(cleanPhone) ? `91${cleanPhone}` : cleanPhone,
        cleanPhone.startsWith('91') ? cleanPhone.substring(2) : cleanPhone,
      ].filter((p, i, arr) => arr.indexOf(p) === i);

      for (const v of variations) {
        allPhoneVariations.add(v);
        phoneVariationMap.set(v, message.phone);
      }
    }

    // Single query for all responses
    const allResponses = await this.prisma.whatsAppMessage.findMany({
      where: {
        from: { in: Array.from(allPhoneVariations) },
        direction: 'incoming',
        createdAt: { gte: earliestDate },
      },
      orderBy: { createdAt: 'desc' },
      select: { from: true, message: true, createdAt: true },
    });

    // Group responses by original phone
    const responseByPhone = new Map<string, typeof allResponses[0]>();
    for (const r of allResponses) {
      const originalPhone = phoneVariationMap.get(r.from);
      if (originalPhone && !responseByPhone.has(originalPhone)) {
        responseByPhone.set(originalPhone, r);
      }
    }

    const results = messages.map((message) => {
      const lastResponse = responseByPhone.get(message.phone) || null;
      return {
        name: message.name,
        phone: message.phone,
        status: message.status,
        error: message.error,
        createdAt: message.createdAt,
        hasResponse: !!lastResponse,
        lastResponse: lastResponse ? { message: lastResponse.message, createdAt: lastResponse.createdAt } : null,
      };
    });

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