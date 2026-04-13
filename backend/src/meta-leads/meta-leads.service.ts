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
          fields: 'id,name,page_id,status,leads_count,lead_gen_export_csv_url'
        },
      });
      
      this.logger.log(`Form Info for ${formId}:`, JSON.stringify(response.data));
      
      // Also try to get the total count directly
      const leadsCountUrl = `https://graph.facebook.com/v25.0/${formId}/leads`;
      const leadsResponse = await axios.get(leadsCountUrl, {
        params: { 
          access_token: accessToken,
          summary: true,
          limit: 0
        },
      });
      
      this.logger.log(`Leads summary:`, JSON.stringify(leadsResponse.data));
      
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

  async syncLeadsFromFacebook(pageId: string, formId: string, accessToken: string, phoneNumberId?: string, tenantId?: string, since?: string) {
    try {
      // Build initial URL - fetch ALL leads without date filter
      let baseUrl = `https://graph.facebook.com/v25.0/${formId}/leads?access_token=${accessToken}&fields=id,created_time,field_data&limit=500`;
      
      let url = baseUrl;
      let allLeads: any[] = [];
      let pageCount = 0;

      // Loop through all pages to get ALL leads
      while (url) {
        pageCount++;
        this.logger.log(`Fetching page ${pageCount}...`);
        
        const response = await axios.get(url);
        const data = response.data;
        const leads = data.data || [];
        allLeads.push(...leads);
        
        this.logger.log(`Page ${pageCount}: Got ${leads.length} leads. Total so far: ${allLeads.length}`);
        
        // Check for next page in multiple ways
        if (data.paging) {
          this.logger.log(`Paging object:`, JSON.stringify(data.paging));
          
          // Try to get next URL
          if (data.paging.next) {
            url = data.paging.next;
            this.logger.log(`Found paging.next, continuing to next page...`);
          } else if (data.paging.cursors?.after) {
            // Manually construct next URL using 'after' cursor
            url = `https://graph.facebook.com/v25.0/${formId}/leads?access_token=${accessToken}&fields=id,created_time,field_data&limit=500&after=${data.paging.cursors.after}`;
            this.logger.log(`No paging.next found, but cursors.after exists. Constructing URL manually...`);
          } else {
            url = null;
            this.logger.log(`No more pages (no next URL or after cursor).`);
          }
        } else {
          url = null;
          this.logger.log(`No paging object. Finished fetching.`);
        }
      }
      
      this.logger.log(`✅ Total leads fetched from Meta API: ${allLeads.length}`);
      
      if (allLeads.length === 0) {
        return { 
          success: true, 
          count: 0,
          message: 'No leads found for this form. The form may not have any submissions yet.'
        };
      }

      const savedLeads: any[] = [];
      const client = this.getClient(tenantId || 'default');

      for (const lead of allLeads) {
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

      this.logger.log(`✅ Successfully saved ${savedLeads.length} leads to database`);
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

  async importLeadsFromCSV(csvData: any[], pageId: string, formId: string, phoneNumberId?: string, tenantId?: string) {
    try {
      const client = this.getClient(tenantId || 'default');
      const savedLeads: any[] = [];
      let skipped = 0;

      this.logger.log(`Starting CSV import: ${csvData.length} rows`);

      for (const row of csvData) {
        try {
          // Parse CSV row - Meta CSV format
          const leadData: any = {
            status: 'Intake',
          };

          // Map CSV columns to lead fields (flexible mapping)
          Object.keys(row).forEach(key => {
            const lowerKey = key.toLowerCase().trim();
            const value = row[key]?.toString().trim();
            
            if (!value) return;

            if (lowerKey.includes('name') || lowerKey === 'full_name') {
              leadData.name = value;
            } else if (lowerKey.includes('email')) {
              leadData.email = value;
            } else if (lowerKey.includes('phone')) {
              leadData.phone = value;
            } else if (lowerKey.includes('company')) {
              leadData.company = value;
            } else if (lowerKey.includes('created') || lowerKey.includes('date')) {
              // Try to parse date
              try {
                leadData.createdTime = new Date(value);
              } catch (e) {
                // If date parsing fails, use current time
                leadData.createdTime = new Date();
              }
            } else if (lowerKey.includes('id') && !lowerKey.includes('form') && !lowerKey.includes('page')) {
              leadData.leadId = value;
            }
          });

          // Generate a unique leadId if not present
          if (!leadData.leadId) {
            leadData.leadId = `csv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          }

          // Set default createdTime if not present
          if (!leadData.createdTime) {
            leadData.createdTime = new Date();
          }

          // Skip if no name and no email and no phone
          if (!leadData.name && !leadData.email && !leadData.phone) {
            skipped++;
            continue;
          }

          // Upsert lead
          const saved = await client.metaLead.upsert({
            where: { leadId: leadData.leadId },
            update: {
              name: leadData.name,
              email: leadData.email,
              phone: leadData.phone,
              company: leadData.company,
              status: leadData.status,
            },
            create: {
              leadId: leadData.leadId,
              formId: formId || 'csv-import',
              pageId: pageId || 'csv-import',
              createdTime: leadData.createdTime,
              name: leadData.name,
              email: leadData.email,
              phone: leadData.phone,
              company: leadData.company,
              status: leadData.status,
            },
          });

          // Sync to contacts if phone exists
          if (leadData.phone) {
            await this.syncToContact(leadData, phoneNumberId, tenantId);
          }

          savedLeads.push(saved);
        } catch (rowError) {
          this.logger.error(`Error processing row:`, rowError);
          skipped++;
        }
      }

      this.logger.log(`✅ CSV Import complete: ${savedLeads.length} imported, ${skipped} skipped`);
      return { 
        success: true, 
        count: savedLeads.length, 
        skipped,
        message: `Successfully imported ${savedLeads.length} leads${skipped > 0 ? `, skipped ${skipped} invalid rows` : ''}` 
      };
    } catch (error) {
      this.logger.error('CSV import failed:', error);
      throw new Error(error.message || 'Failed to import CSV');
    }
  }
}
