import { Injectable, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import axios from 'axios';

@Injectable()
export class MetaLeadsService {
  private readonly logger = new Logger(MetaLeadsService.name);

  constructor(private prisma: TenantPrismaService) {}

  private getClient(tenantId: string) {
    const dbUrl = process.env.TENANT_DATABASE_URL || '';
    return this.prisma.getTenantClient(tenantId, dbUrl) as any;
  }

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

    try {
      const client = this.getClient(tenantId);
      const [leads, total] = await Promise.all([
        client.metaLead.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdTime: 'desc' },
        }),
        client.metaLead.count({ where }),
      ]);

      return {
        data: leads,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    } catch (error) {
      this.logger.error('Error fetching leads:', error);
      return {
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      };
    }
  }

  async updateLeadStatus(id: number, status: string, tenantId: string) {
    const client = this.getClient(tenantId);
    return client.metaLead.update({
      where: { id },
      data: { status },
    });
  }

  async getFormInfo(formId: string, accessToken: string) {
    try {
      const url = `https://graph.facebook.com/v25.0/${formId}`;
      const response = await axios.get(url, {
        params: { 
          access_token: accessToken,
          fields: 'id,name,page_id,status,leads_count'
        },
      });
      return response;
    } catch (error) {
      this.logger.error('Failed to get form info:', error);
      if (error.response?.data?.error) {
        const metaError = error.response.data.error;
        throw new Error(`Meta API Error: ${metaError.message}`);
      }
      throw new Error(error.message || 'Failed to get form info');
    }
  }

  async syncLeadsFromFacebook(pageId: string, formId: string, accessToken: string, phoneNumberId?: string, tenantId?: string) {
    try {
      const url = `https://graph.facebook.com/v25.0/${formId}/leads`;
      const { data } = await axios.get(url, {
        params: { 
          access_token: accessToken,
          fields: 'id,created_time,field_data'
        },
      });

      const leads = data.data || [];
      
      if (leads.length === 0) {
        return { 
          success: true, 
          count: 0,
          message: 'No leads found for this form. The form may not have any submissions yet.'
        };
      }

      const savedLeads: any[] = [];
      const client = this.getClient(tenantId || 'default');

      for (const lead of leads) {
        const fieldData = this.parseLeadFields(lead.field_data);
        
        const saved = await client.metaLead.upsert({
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
          await this.syncToContact(fieldData, phoneNumberId, tenantId);
        }

        savedLeads.push(saved);
      }

      return { success: true, count: savedLeads.length };
    } catch (error) {
      this.logger.error('Failed to sync leads:', error);
      
      // Return detailed Meta API error
      if (error.response?.data?.error) {
        const metaError = error.response.data.error;
        let errorMessage = metaError.message;
        
        // Add helpful context based on error code
        if (metaError.code === 100) {
          errorMessage += ' - This usually means: 1) The Form ID is incorrect, 2) Your access token lacks required permissions (leads_retrieval), or 3) The form doesn\'t belong to your Page.';
        } else if (metaError.code === 190) {
          errorMessage += ' - Your access token has expired or is invalid. Please generate a new token.';
        }
        
        throw new Error(errorMessage);
      }
      
      throw new Error(error.message || 'Failed to sync leads from Facebook');
    }
  }

  private async syncToContact(leadData: any, phoneNumberId?: string, tenantId?: string) {
    try {
      const client = this.getClient(tenantId || 'default');
      await client.contact.upsert({
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

  async handleWebhook(body: any, tenantId?: string) {
    try {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      
      if (changes?.field === 'leadgen') {
        const leadgenId = changes.value.leadgen_id;
        const pageId = changes.value.page_id;
        const formId = changes.value.form_id;
        
        const client = this.getClient(tenantId || 'default');
        const masterConfig = await client.masterConfig.findFirst({
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
        
        await client.metaLead.create({
          data: {
            leadId: leadgenId,
            formId,
            pageId,
            createdTime: new Date(data.created_time),
            ...fieldData,
          },
        });

        if (fieldData.phone) {
          await this.syncToContact(fieldData, masterConfig.phoneNumberId, tenantId);
        }

        this.logger.log(`Lead synced: ${leadgenId}`);
        return { success: true };
      }
    } catch (error) {
      this.logger.error('Webhook processing failed:', error);
      throw error;
    }
  }

  async getMasterConfig(tenantId?: string) {
    const client = this.getClient(tenantId || 'default');
    return client.masterConfig.findFirst({
      where: { isActive: true },
    });
  }
}
