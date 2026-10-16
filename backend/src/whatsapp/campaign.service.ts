import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CentralPrismaService } from '../central-prisma.service';
import { TenantPrismaService } from '../tenant-prisma.service';
import { WhatsappService } from './whatsapp.service';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/campaign.dto';
import {
  isWithinAllowedSendingHours,
  getAllowedSendingWindowInfo,
  CAMPAIGN_STATUS_OUTSIDE_HOURS,
  isOutsideSendingHoursStatus,
  formatCampaignStatusLabel,
  getNextAllowedWindowStart
} from '../utils/campaign-window.util';

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);

  constructor(
    private prisma: PrismaService,
    private centralPrisma: CentralPrismaService,
    private tenantPrisma: TenantPrismaService,
    private whatsappService: WhatsappService
  ) { }

  private async getClient(userId?: number) {
    if (userId && userId > 0) {
      try {
        const tenant = await this.centralPrisma.tenant.findUnique({
          where: { id: userId },
        });
        if (tenant) {
          const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
          return this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);
        }
      } catch (err: any) {
        this.logger.warn(`Could not get tenant client directly for userId ${userId}: ${err.message}`);
      }
    }
    return this.prisma as any;
  }
  async createCampaign(createCampaignDto: CreateCampaignDto, userId: number) {
    const client = await this.getClient(userId);
    const scheduleType = createCampaignDto.scheduleType || 'one-time';
    const status = scheduleType === 'time-based' ? 'scheduled' : 'draft';

    // 1. Get WhatsApp settings
    const settings = await client.whatsAppSettings.findFirst({
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
        create: createCampaignDto.contacts.map((contact: any) => ({
          name: contact.name,
          phone: contact.phone,
        })),
      },
    };

    // 3. If groupId is provided, validate and attach group relation
    if (createCampaignDto.groupId) {
      const group = await client.group.findFirst({
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
    const campaign = await client.campaign.create({
      data,
      include: {
        contacts: true,
        group: true,
      },
    });

    return campaign;
  }

  async getCampaign(id: number, userId: number) {
    const client = await this.getClient(userId);
    const campaign = await client.campaign.findFirst({
      where: { id },
      include: {
        contacts: true,
        messages: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!campaign) throw new NotFoundException('Campaign not found');
    return {
      ...campaign,
      statusLabel: formatCampaignStatusLabel(campaign.status),
    };
  }

  async getCampaigns(userId: number, settingsName?: string) {
    const client = await this.getClient(userId);
    const campaigns = await client.campaign.findMany({
      where: {
        ...(settingsName ? { settings: { templateName: settingsName } } : {}),
      },
      include: {
        contacts: true,
        group: true,
        settings: true,
        messages: {
          select: { status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return campaigns.map((c: any) => {
      let successCount = c.successCount || 0;
      let failedCount = c.failedCount || 0;

      if (c.messages && c.messages.length > 0) {
        const msgSuccess = c.messages.filter((m: any) => ['sent', 'delivered', 'read'].includes(m.status)).length;
        const msgFailed = c.messages.filter((m: any) => m.status === 'failed').length;

        // If currently running or database counts were 0 despite messages existing, use live counts
        if (c.status === 'running' || (successCount === 0 && failedCount === 0)) {
          successCount = msgSuccess;
          failedCount = msgFailed;
        }
      }

      const totalCount = c.totalCount || c.contacts?.length || 0;
      let status = c.status;

      // Auto-heal status if all messages finished but status remained 'running'
      if (status === 'running' && totalCount > 0 && (successCount + failedCount) >= totalCount) {
        status = 'completed';
        client.campaign.update({
          where: { id: c.id },
          data: { status: 'completed', successCount, failedCount }
        }).catch(() => {});
      }

      return {
        ...c,
        status,
        totalCount,
        successCount,
        failedCount,
        statusLabel: formatCampaignStatusLabel(status),
      };
    });
  }

  async updateCampaign(id: number, updateCampaignDto: UpdateCampaignDto, userId: number) {
    const client = await this.getClient(userId);
    const campaign = await client.campaign.findFirst({
      where: { id }
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const scheduleType = updateCampaignDto.scheduleType || campaign.scheduleType;
    const status = scheduleType === 'time-based' ? 'scheduled' : 'draft';

    const updatedCampaign = await client.campaign.update({
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

    if (updateCampaignDto.contacts) {
      await client.campaignContact.deleteMany({
        where: { campaignId: id }
      });

      await client.campaignContact.createMany({
        data: updateCampaignDto.contacts.map((contact: any) => ({
          name: contact.name,
          phone: contact.phone,
          campaignId: id
        }))
      });
    }

    return this.getCampaign(id, userId);
  }

  async runCampaign(id: number, userId: number, isResume: boolean = false) {
    const client = await this.getClient(userId);
    const campaign = await this.getCampaign(id, userId);

    // 1. Meta Healthy Rule Check: Allowed hours 8:00 AM - 8:00 PM IST
    if (!isWithinAllowedSendingHours()) {
      const windowInfo = getAllowedSendingWindowInfo();
      this.logger.warn(`Campaign ${id} attempted outside allowed sending window (8:00 AM - 8:00 PM IST). Pausing campaign until morning 8:00 AM IST.`);
      await client.campaign.update({
        where: { id },
        data: {
          status: CAMPAIGN_STATUS_OUTSIDE_HOURS,
        }
      });
      return {
        campaignId: id,
        totalContacts: campaign.contacts?.length || 0,
        successCount: campaign.successCount || 0,
        failedCount: campaign.failedCount || 0,
        status: CAMPAIGN_STATUS_OUTSIDE_HOURS,
        statusLabel: 'Paused – Outside Sending Hours',
        rescheduledFor: windowInfo.nextWindowOpensAt,
        nextWindowStartDate: windowInfo.nextWindowStartDate,
        isNightPaused: true,
        message: 'Campaign paused: Outside allowed sending hours (8:00 AM - 8:00 PM IST). Messages will start sending automatically at 8:00 AM IST.'
      };
    }

    // Update campaign status to running
    await client.campaign.update({
      where: { id },
      data: {
        status: 'running',
        ...(isResume ? {} : { successCount: 0, failedCount: 0 })
      }
    });

    let successCount = isResume ? campaign.successCount : 0;
    let failedCount = isResume ? campaign.failedCount : 0;
    let totalContactsCount = 0;

    try {
      const settings = await client.whatsAppSettings.findUnique({
        where: { id: campaign.settingsId }
      });

      let contactsToSend = campaign.contacts || [];

      // If contacts are empty but groupId exists, load from group!
      if ((!contactsToSend || contactsToSend.length === 0) && campaign.groupId) {
        const groupContacts = await client.contact.findMany({
          where: { groupId: campaign.groupId, isActive: true },
          select: { name: true, phone: true }
        });
        if (groupContacts.length > 0) {
          await client.campaignContact.createMany({
            data: groupContacts.map((c: any) => ({
              name: c.name,
              phone: c.phone,
              campaignId: id
            }))
          });
          contactsToSend = groupContacts as any;
          await client.campaign.update({
            where: { id },
            data: { totalCount: contactsToSend.length }
          });
        }
      }

      if (isResume) {
        const existingMessages = await client.campaignMessage.findMany({
          where: { campaignId: id },
          select: { phone: true, status: true }
        });
        const processedPhones = new Set(
          existingMessages
            .filter((m: any) => ['sent', 'delivered', 'read'].includes(m.status))
            .flatMap((m: any) => [
              m.phone,
              this.formatPhoneNumber(m.phone),
              String(m.phone || '').replace(/\D/g, '')
            ])
        );

        contactsToSend = contactsToSend.filter((c: any) => {
          const p1 = c.phone;
          const p2 = this.formatPhoneNumber(c.phone);
          const p3 = String(c.phone || '').replace(/\D/g, '');
          return !processedPhones.has(p1) && !processedPhones.has(p2) && !processedPhones.has(p3);
        });
      } else {
        // Clear previous campaign messages for rerun
        await client.campaignMessage.deleteMany({
          where: { campaignId: id }
        });

        // PRE-CREATE campaignMessage records with status 'queued' so Campaign Results is NEVER 0!
        if (contactsToSend.length > 0) {
          try {
            await client.campaignMessage.createMany({
              data: contactsToSend.map((c: any) => ({
                campaignId: id,
                phone: this.formatPhoneNumber(c.phone),
                name: c.name || null,
                status: 'queued',
                error: null
              }))
            });
          } catch (preErr: any) {
            this.logger.warn(`Failed to pre-create campaign messages: ${preErr.message}`);
          }
        }
      }

      // Filter out opted-out contacts (Stop / stop label)
      try {
        const stopLabels = await client.chatLabel.findMany({
          where: { labels: { hasSome: ['Stop', 'stop'] } },
          select: { phone: true }
        });
        const stopPhones = new Set(stopLabels.map((l: any) => String(l.phone || '').trim().replace(/\D/g, '')));
        if (stopPhones.size > 0) {
          const initialCount = contactsToSend.length;
          contactsToSend = contactsToSend.filter((c: any) => {
            const clean = String(c.phone || '').trim().replace(/\D/g, '');
            return !stopPhones.has(clean);
          });
          const skipped = initialCount - contactsToSend.length;
          if (skipped > 0) {
            this.logger.log(`Campaign ${id}: Suppressed ${skipped} contact(s) due to opt-out (STOP label)`);
          }
        }
      } catch (optErr: any) {
        this.logger.warn(`Failed checking stop labels for campaign ${id}: ${optErr.message}`);
      }

      totalContactsCount = contactsToSend.length;

      this.logger.log(
        `Campaign ${id}: Processing ${contactsToSend.length} contacts in batches`
      );

      const BATCH_SIZE = 50;
      const batches: typeof contactsToSend[] = [];
      for (let i = 0; i < contactsToSend.length; i += BATCH_SIZE) {
        batches.push(contactsToSend.slice(i, i + BATCH_SIZE));
      }

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const currentCampaign = await client.campaign.findUnique({
          where: { id },
          select: { status: true }
        });

        if (currentCampaign?.status === 'stopped') {
          this.logger.log(`Campaign ${id} was stopped.`);
          break;
        }

        if (currentCampaign?.status === 'paused' || isOutsideSendingHoursStatus(currentCampaign?.status)) {
          this.logger.log(`Campaign ${id} was paused.`);
          break;
        }

        if (!isWithinAllowedSendingHours()) {
          this.logger.log(`Campaign ${id} reached 8:00 PM IST cut-off. Pausing remaining batches until 8:00 AM IST.`);
          await client.campaign.update({
            where: { id },
            data: { status: CAMPAIGN_STATUS_OUTSIDE_HOURS }
          });
          break;
        }

        const batch = batches[batchIndex];
        this.logger.log(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} contacts)`);

        try {
          const batchContacts = batch.map((contact: any) => ({ name: contact.name || '', phone: contact.phone }));

          let results: Array<{ phoneNumber: string; success: boolean; messageId?: string; error?: string }> = [];
          try {
            results = await this.whatsappService.sendBulkTemplateMessageWithNames(
              batchContacts,
              campaign.templateName,
              userId,
              campaign.settingsId,
              settings?.headerImageUrl && settings.headerImageUrl.trim() !== '' ? settings.headerImageUrl : undefined,
              id
            );
          } catch (error: any) {
            this.logger.error(`Failed to process batch ${batchIndex + 1}:`, error);
            results = batchContacts.map((contact: any) => ({
              phoneNumber: this.formatPhoneNumber(contact.phone),
              success: false,
              error: error.message || 'Batch processing failed'
            }));
          }

          const contactsToUpsert: Array<{
            phone: string;
            name: string;
            phoneNumberId: string | null;
            groupId: number | null;
          }> = [];

          for (const result of results) {
            const contact = batch.find((c: any) => this.formatPhoneNumber(c.phone) === result.phoneNumber || c.phone === result.phoneNumber) || { name: '', phone: result.phoneNumber };

            if (result.success) {
              successCount++;
            } else {
              failedCount++;
            }

            try {
              await client.campaignMessage.updateMany({
                where: { campaignId: id, phone: result.phoneNumber },
                data: {
                  messageId: result.messageId || null,
                  status: result.success ? 'sent' : 'failed',
                  error: result.error || null,
                  name: contact.name || null
                }
              });
            } catch (upErr: any) {
              try {
                await client.campaignMessage.create({
                  data: {
                    campaignId: id,
                    phone: result.phoneNumber,
                    name: contact.name || null,
                    messageId: result.messageId || null,
                    status: result.success ? 'sent' : 'failed',
                    error: result.error || null
                  }
                });
              } catch {}
            }

            contactsToUpsert.push({
              phone: result.phoneNumber,
              name: contact.name || 'Unknown',
              phoneNumberId: settings?.phoneNumberId || null,
              groupId: campaign.groupId
            });
          }

          // Batch fetch existing contacts
          const batchPhones = contactsToUpsert.map(c => c.phone);
          let existingContactMap = new Map();
          try {
            const existingContacts = await client.contact.findMany({
              where: { phone: { in: batchPhones } },
              select: { id: true, phone: true, name: true, groupId: true },
            });
            existingContactMap = new Map(existingContacts.map((c: any) => [c.phone, c]));
          } catch (dbError: any) {
            this.logger.error('Failed to fetch existing contacts:', dbError.message);
          }

          // Concurrently update/create contacts in small chunks to avoid event loop blockage
          const CHUNK = 10;
          for (let cIdx = 0; cIdx < contactsToUpsert.length; cIdx += CHUNK) {
            const chunk = contactsToUpsert.slice(cIdx, cIdx + CHUNK);
            await Promise.all(chunk.map(async (contactData) => {
              try {
                const existing = existingContactMap.get(contactData.phone);
                if (existing) {
                  const keepName = existing.name &&
                    !['null', 'undefined', 'unknown'].includes(existing.name.trim().toLowerCase())
                      ? existing.name : contactData.name;
                  await client.contact.update({
                    where: { id: existing.id },
                    data: { name: keepName, lastMessageDate: new Date(), groupId: contactData.groupId || existing.groupId, isActive: true },
                  });
                } else {
                  await client.contact.create({
                    data: { phone: contactData.phone, name: contactData.name, phoneNumberId: contactData.phoneNumberId, lastMessageDate: new Date(), groupId: contactData.groupId, isActive: true },
                  });
                }
              } catch {
                // Ignore transient contact errors
              }
            }));
          }

          this.logger.log(`Batch ${batchIndex + 1} completed. Success: ${successCount}, Failed: ${failedCount}`);
          // Persist real-time progress after each batch
          try {
            await client.campaign.update({
              where: { id },
              data: { successCount, failedCount }
            });
          } catch (countUpdateErr: any) {
            this.logger.warn(`Failed to update intermediate counts for campaign ${id}: ${countUpdateErr.message}`);
          }
        } catch (batchError: any) {
          this.logger.error(`Critical error processing batch ${batchIndex + 1}:`, batchError.message);
        }
      }
    } catch (globalError: any) {
      this.logger.error(`Critical error during campaign ${id} execution:`, globalError.message);
    } finally {
      // Update final campaign status and counts
      try {
        const currentCampaign = await client.campaign.findUnique({ where: { id }, select: { status: true } });
        if (currentCampaign?.status !== 'stopped' && currentCampaign?.status !== 'paused' && !isOutsideSendingHoursStatus(currentCampaign?.status)) {
          await client.campaign.update({
            where: { id },
            data: {
              status: 'completed',
              successCount,
              failedCount
            }
          });
        } else {
          await client.campaign.update({
            where: { id },
            data: {
              successCount,
              failedCount
            }
          });
        }
      } catch (finalDbError: any) {
        this.logger.error('Failed to update final campaign status in database:', finalDbError.message);
      }

      this.logger.log(`Campaign ${id} finished. Total Success: ${successCount}, Total Failed: ${failedCount}`);
    }

    return {
      campaignId: id,
      totalContacts: totalContactsCount,
      successCount,
      failedCount
    };
  }

  async stopCampaign(id: number, userId: number) {
    const client = await this.getClient(userId);
    const campaign = await client.campaign.findFirst({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    await client.campaign.update({
      where: { id },
      data: { status: 'stopped' }
    });
    return { message: 'Campaign stopped successfully' };
  }

  async pauseCampaign(id: number, userId: number) {
    const client = await this.getClient(userId);
    const campaign = await client.campaign.findFirst({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    await client.campaign.update({
      where: { id },
      data: { status: 'paused' }
    });
    return { message: 'Campaign paused successfully' };
  }

  async deleteCampaign(id: number, userId: number) {
    const client = await this.getClient(userId);
    const campaign = await client.campaign.findFirst({
      where: { id }
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    await client.campaign.delete({
      where: { id }
    });

    return { message: 'Campaign deleted successfully' };
  }

  async getCampaignResults(id: number, userId: number) {
    const client = await this.getClient(userId);
    const campaign = await client.campaign.findFirst({
      where: { id },
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

    let messages = campaign.messages || [];

    // Auto-heal if messages are empty but contacts exist
    if (messages.length === 0 && campaign.contacts && campaign.contacts.length > 0) {
      try {
        const phoneList = campaign.contacts.map((c: any) => this.formatPhoneNumber(c.phone));
        const sentMessages = await client.whatsAppMessage.findMany({
          where: {
            to: { in: phoneList },
            direction: 'outgoing',
            createdAt: { gte: new Date(new Date(campaign.createdAt).getTime() - 24 * 60 * 60 * 1000) }
          },
          orderBy: { createdAt: 'desc' }
        });

        const sentMap = new Map<string, any>();
        for (const sm of sentMessages) {
          if (!sentMap.has(sm.to)) {
            sentMap.set(sm.to, sm);
          }
        }

        const healingMessages: any[] = [];
        for (const contact of campaign.contacts) {
          const formatted = this.formatPhoneNumber(contact.phone);
          const sm = sentMap.get(formatted);
          healingMessages.push({
            campaignId: id,
            phone: formatted,
            name: contact.name,
            messageId: sm ? sm.messageId : null,
            status: sm ? sm.status : (campaign.status === 'running' ? 'queued' : 'pending'),
            error: sm?.error || null,
            createdAt: sm ? sm.createdAt : campaign.createdAt,
            updatedAt: sm ? sm.updatedAt : campaign.createdAt,
          });
        }

        if (healingMessages.length > 0) {
          await client.campaignMessage.createMany({
            data: healingMessages.map(m => ({
              campaignId: m.campaignId,
              phone: m.phone,
              name: m.name,
              messageId: m.messageId,
              status: m.status,
              error: m.error
            }))
          }).catch(() => {});
          messages = healingMessages as any;

          // Update campaign counts
          const successCount = healingMessages.filter(m => ['sent', 'delivered', 'read'].includes(m.status)).length;
          const failedCount = healingMessages.filter(m => m.status === 'failed').length;
          await client.campaign.update({
            where: { id },
            data: { successCount, failedCount }
          }).catch(() => {});
        }
      } catch (healErr: any) {
        this.logger.warn(`Failed to auto-heal campaign messages for campaign ${id}: ${healErr.message}`);
      }
    }

    const earliestDate = messages.reduce((min: any, m: any) => m.createdAt < min ? m.createdAt : min, messages[0]?.createdAt || new Date());
    const allPhoneVariations = new Set<string>();
    const phoneVariationMap = new Map<string, string>();

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
    let allResponses: any[] = [];
    if (allPhoneVariations.size > 0) {
      allResponses = await client.whatsAppMessage.findMany({
        where: {
          from: { in: Array.from(allPhoneVariations) },
          direction: 'incoming',
          createdAt: { gte: earliestDate },
        },
        orderBy: { createdAt: 'desc' },
        select: { from: true, message: true, createdAt: true },
      });
    }

    const responseByPhone = new Map<string, any>();
    for (const r of allResponses) {
      const originalPhone = phoneVariationMap.get(r.from);
      if (originalPhone && !responseByPhone.has(originalPhone)) {
        responseByPhone.set(originalPhone, r);
      }
    }

    const results = messages.map((message: any) => {
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