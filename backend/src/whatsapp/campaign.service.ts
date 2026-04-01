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

      // Process batch contacts in parallel
      const batchResults = await Promise.allSettled(
        batch.map(async (contact) => {
          try {
            this.logger.log(`Sending campaign message to ${contact.phone}`);

            const result = await this.whatsappService.sendBulkTemplateMessageWithNames(
              [{ name: contact.name || '', phone: contact.phone }],
              campaign.templateName,
              userId,
              campaign.settingsId,
              settings?.headerImageUrl && settings.headerImageUrl.trim() !== '' ? settings.headerImageUrl : undefined
            );

            const messageResult = result[0];
            const status = messageResult.success ? 'sent' : 'failed';
            const formattedPhone = this.formatPhoneNumber(
              messageResult.phoneNumber || contact.phone,
            );
            
            let errorMessage = messageResult.error || null;
            
            return {
              success: messageResult.success,
              messageId: messageResult.messageId || null,
              phone: formattedPhone,
              name: contact.name,
              status,
              error: errorMessage
            };
          } catch (error) {
            this.logger.error(`Failed to send to ${contact.phone}:`, error);
            const formattedPhone = this.formatPhoneNumber(contact.phone);
            
            let errorMessage = error.message;
            if (error.response?.data?.error) {
              const apiError = error.response.data.error;
              if (apiError.code === 131026) {
                errorMessage = 'Number not registered on WhatsApp';
              } else if (apiError.code === 131047) {
                errorMessage = 'Message failed to send - Invalid number';
              } else {
                errorMessage = apiError.error_user_msg || apiError.message || error.message;
              }
            }
            
            return {
              success: false,
              messageId: null,
              phone: formattedPhone,
              name: contact.name,
              status: 'failed',
              error: errorMessage
            };
          }
        })
      );

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

      // Upsert contacts
      for (const contactData of contactsToUpsert) {
        try {
          const existingContact = await this.prisma.contact.findFirst({
            where: {
              phone: contactData.phone,
              phoneNumberId: contactData.phoneNumberId,
            },
          });

          if (existingContact) {
            await this.prisma.contact.update({
              where: { id: existingContact.id },
              data: {
                name:
                  existingContact.name &&
                  !['null', 'undefined', 'unknown'].includes(
                    existingContact.name.trim().toLowerCase(),
                  )
                    ? existingContact.name
                    : contactData.name,
                lastMessageDate: new Date(),
                groupId: contactData.groupId || existingContact.groupId,
                isActive: true,
              },
            });
          } else {
            await this.prisma.contact.create({
              data: {
                phone: contactData.phone,
                name: contactData.name,
                phoneNumberId: contactData.phoneNumberId,
                lastMessageDate: new Date(),
                groupId: contactData.groupId,
                isActive: true,
              },
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

    // Get response data for each contact
    const results = await Promise.all(
      (campaign.messages || []).map(async (message) => {
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

        // Debug: Check all incoming messages
        const allIncoming = await this.prisma.whatsAppMessage.findMany({
          where: {
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
          error: message.error,
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