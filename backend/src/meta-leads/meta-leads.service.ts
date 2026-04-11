import { Injectable, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import axios from 'axios';

@Injectable()
export class MetaLeadsService {
  private readonly logger = new Logger(MetaLeadsService.name);

  constructor(private prisma: TenantPrismaService) {}

  async getLeads(tenantId: string, page = 1, limit = 10, search = '', status = '') {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [leads, total] = await Promise.all([
      this.prisma['metaLead'].findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdTime: 'desc' },
      }),
      this.prisma['metaLead'].count({ where }),
    ]);

    return {
      data: leads,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateLeadStatus(id: number, status: string) {
    return this.prisma['metaLead'].update({
      where: { id },
      data: { status },
    });
  }

  async syncLeadsFromFacebook(pageId: string, formId: string, accessToken: string, phoneNumberId?: string) {
    try {
      const url = `https://graph.facebook.com/v25.0/${formId}/leads`;
      const { data } = await axios.get(url, {
        params: { access_token: accessToken },
      });

      const leads = data.data || [];
      const savedLeads: any[] = [];

      for (const lead of leads) {
        const fieldData = this.parseLeadFields(lead.field_data);
        
        const saved = await this.prisma['metaLead'].upsert({
          where: { leadId: lead.id },
          update: { ...fieldData },
          create: {
            leadId: lead.id,
            formId,
            pageId,
            createdTime: new Date(lead.created_time),
            ...fieldData,
          },
        });

        if (fieldData.phone) {
          await this.syncToContact(fieldData, phoneNumberId);
        }

        savedLeads.push(saved);
      }

      return { success: true, count: savedLeads.length };
    } catch (error) {
      this.logger.error('Failed to sync leads:', error);
      throw error;
    }
  }

  private async syncToContact(leadData: any, phoneNumberId?: string) {
    try {
      await this.prisma['contact'].upsert({
        where: {
          phone_phoneNumberId: {
            phone: leadData.phone,
            phoneNumberId: phoneNumberId || 'meta-lead',
          },
        },
        update: {
          name: leadData.name || 'Meta Lead',
          email: leadData.email,
          place: leadData.company,
        },
        create: {
          name: leadData.name || 'Meta Lead',
          email: leadData.email,
          phone: leadData.phone,
          place: leadData.company,
          phoneNumberId: phoneNumberId || 'meta-lead',
        },
      });
    } catch (error) {
      this.logger.error('Failed to sync to contact:', error);
    }
  }

  private parseLeadFields(fieldData: any[]) {
    const parsed: any = { status: 'Intake' };
    
    fieldData.forEach(field => {
      const name = field.name.toLowerCase();
      if (name.includes('name') || name === 'full_name') parsed.name = field.values[0];
      else if (name.includes('email')) parsed.email = field.values[0];
      else if (name.includes('phone')) parsed.phone = field.values[0];
      else if (name.includes('company')) parsed.company = field.values[0];
    });

    return parsed;
  }

  async handleWebhook(body: any) {
    try {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      
      if (changes?.field === 'leadgen') {
        const leadgenId = changes.value.leadgen_id;
        const pageId = changes.value.page_id;
        const formId = changes.value.form_id;
        
        const masterConfig = await this.prisma['masterConfig'].findFirst({
          where: { isActive: true },
        });

        if (!masterConfig) {
          this.logger.error('No active MasterConfig found');
          return { success: false, error: 'No active config' };
        }

        const { data } = await axios.get(
          `https://graph.facebook.com/v25.0/${leadgenId}`,
          { params: { access_token: masterConfig.accessToken } }
        );

        const fieldData = this.parseLeadFields(data.field_data);
        
        await this.prisma['metaLead'].create({
          data: {
            leadId: leadgenId,
            formId,
            pageId,
            createdTime: new Date(data.created_time),
            ...fieldData,
          },
        });

        if (fieldData.phone) {
          await this.syncToContact(fieldData, masterConfig.phoneNumberId);
        }

        this.logger.log(`Lead synced: ${leadgenId}`);
        return { success: true };
      }
    } catch (error) {
      this.logger.error('Webhook processing failed:', error);
      throw error;
    }
  }

  async getMasterConfig() {
    return this.prisma['masterConfig'].findFirst({
      where: { isActive: true },
    });
  }
}
