import { Injectable, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import axios from 'axios';

@Injectable()
export class MetaLeadsService {
  private readonly logger = new Logger(MetaLeadsService.name);

  constructor(private prisma: TenantPrismaService) {}

  private async getClient(tenantId: string, dbUrl?: string) {
    const url = dbUrl || process.env.TENANT_DATABASE_URL || '';
    return await this.prisma.getTenantClientReady(tenantId, url) as any;
  }

  async getLeads(tenantId: string, page = 1, limit = 10, search = '', status = '', campaignName = '') {
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

    if (campaignName) {
      where.campaignName = campaignName;
    }

    try {
      const client = await this.getClient(tenantId);
      const [leads, total] = await Promise.all([
        client.metaLead.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdTime: 'desc' },
        }),
        client.metaLead.count({ where }),
      ]);

      // Transform leads to ensure proper serialization
      const transformedLeads = leads.map(lead => ({
        ...lead,
        phone: lead.phone || null,
        email: lead.email || null,
        company: lead.company || null,
        city: lead.city || null,
        businessType: lead.businessType || null,
        campaignName: lead.campaignName || null,
      }));

      this.logger.log(`Fetched ${transformedLeads.length} leads. Sample lead:`, JSON.stringify(transformedLeads[0]));

      return {
        data: transformedLeads,
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
    const client = await this.getClient(tenantId);
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

  async syncLeadsFromFacebook(pageId: string, formId: string, accessToken: string, phoneNumberId?: string, tenantId?: string, dbUrl?: string, since?: string) {
    this.logger.log('=== SYNC LEADS FROM FACEBOOK ===');
    this.logger.log(`Tenant ID: ${tenantId}`);
    this.logger.log(`DB URL: ${dbUrl ? dbUrl.replace(/:[^:@]+@/, ':****@') : 'NOT PROVIDED'}`);
    this.logger.log(`Page ID: ${pageId}`);
    this.logger.log(`Form ID: ${formId}`);
    
    try {
      let allLeads: any[] = [];
      let formNameMap = new Map<string, string>();

      if (formId && formId !== 'all') {
        this.logger.log(`Syncing leads from single form: ${formId}`);
        
        // Get form name
        try {
          const formResponse = await axios.get(`https://graph.facebook.com/v25.0/${formId}`, {
            params: { access_token: accessToken, fields: 'id,name' }
          });
          formNameMap.set(formId, formResponse.data.name || 'Unnamed Form');
        } catch (e) {
          this.logger.warn(`Could not fetch form name for ${formId}`);
        }
        
        allLeads = await this.fetchLeadsFromForm(formId, accessToken);
      } else {
        this.logger.log(`Fetching all forms from page: ${pageId}`);
        
        // Fetch ALL forms with pagination
        let formsUrl: string | null = `https://graph.facebook.com/v25.0/${pageId}/leadgen_forms?access_token=${accessToken}&limit=100&fields=id,name`;
        let allForms: any[] = [];
        
        while (formsUrl) {
          const { data: formsData } = await axios.get(formsUrl);
          const forms = formsData.data || [];
          allForms.push(...forms);
          formsUrl = formsData.paging?.next || null;
        }
        
        this.logger.log(`Found ${allForms.length} forms on this page`);

        // Build form name map
        allForms.forEach(form => {
          formNameMap.set(form.id, form.name || 'Unnamed Form');
        });

        for (const form of allForms) {
          this.logger.log(`Fetching leads from form: ${form.id} (${form.name || 'Unnamed'})`);
          const formLeads = await this.fetchLeadsFromForm(form.id, accessToken);
          allLeads.push(...formLeads);
          this.logger.log(`Got ${formLeads.length} leads from form ${form.id}`);
        }
      }
      
      this.logger.log(`✅ Total leads fetched from Meta API: ${allLeads.length}`);
      
      // Log sample lead for debugging
      if (allLeads.length > 0) {
        this.logger.log('Sample lead from Meta API:', JSON.stringify(allLeads[0], null, 2));
      }
      
      if (allLeads.length === 0) {
        return { 
          success: true, 
          count: 0,
          message: 'No leads found. The forms may not have any submissions yet.'
        };
      }

      const savedLeads: any[] = [];
      const url = dbUrl || process.env.TENANT_DATABASE_URL || '';
      const tid = tenantId || 'default';

      this.logger.log(`Starting to save ${allLeads.length} leads for tenant ${tid}`);
      this.logger.log(`Database URL: ${url.replace(/:[^:@]+@/, ':****@')}`);

      for (const lead of allLeads) {
        const fieldData = this.parseLeadFields(lead.field_data);
        const leadFormId = lead.form_id || formId || 'unknown';
        const campaignName = formNameMap.get(leadFormId) || null;
        
        try {
          const saved = await this.prisma.executeWithRetry<any>(
            tid,
            url,
            async (client: any) => {
              return await client.metaLead.upsert({
                where: { leadId: lead.id },
                update: { ...fieldData, campaignName },
                create: {
                  leadId: lead.id,
                  formId: leadFormId,
                  pageId,
                  campaignName,
                  createdTime: new Date(lead.created_time),
                  ...fieldData,
                },
              });
            },
            3 // Increase retries to 3
          );

          if (fieldData.phone) {
            await this.syncToContact(fieldData, phoneNumberId, tid, url);
          }

          savedLeads.push(saved);
          this.logger.log(`Saved lead ${lead.id} (${savedLeads.length}/${allLeads.length})`);
        } catch (error) {
          this.logger.error(`Failed to save lead ${lead.id}:`, error.message);
          // Continue with next lead instead of failing completely
        }
      }

      this.logger.log(`✅ Successfully saved ${savedLeads.length} leads to database`);
      return { success: true, count: savedLeads.length };
    } catch (error) {
      this.logger.error('Failed to sync leads:', error);
      
      if (error.response?.data?.error) {
        const metaError = error.response.data.error;
        let errorMessage = metaError.message;
        
        if (metaError.code === 100) {
          errorMessage += ' - This usually means: 1) The Form ID is incorrect, 2) Your access token lacks required permissions (leads_retrieval), or 3) The form doesn\'t belong to your Page.';
        } else if (metaError.code === 190) {
          errorMessage += ' - Your access token has expired or is invalid. Please generate a new token.';
        }
        
        throw new Error(errorMessage);
      }
      
      const errorMessage = error.message || 'Failed to sync leads from Facebook';
      const details = 'Common issues: 1) Invalid Form ID, 2) Missing permissions (leads_retrieval, pages_manage_metadata), 3) Form not linked to Page ID, 4) Expired access token';
      throw new Error(`${errorMessage}\n\n${details}`);
    }
  }

  private async fetchLeadsFromForm(formId: string, accessToken: string): Promise<any[]> {
    let url: string | null = `https://graph.facebook.com/v25.0/${formId}/leads?access_token=${accessToken}&fields=id,created_time,field_data,form_id&limit=500`;
    let allLeads: any[] = [];

    while (url) {
      const response = await axios.get(url);
      const data = response.data;
      const leads = data.data || [];
      allLeads.push(...leads);
      url = data.paging?.next || null;
    }

    return allLeads;
  }

  private async syncToContact(leadData: any, phoneNumberId?: string, tenantId?: string, dbUrl?: string) {
    try {
      const url = dbUrl || process.env.TENANT_DATABASE_URL || '';
      await this.prisma.executeWithRetry<any>(
        tenantId || 'default',
        url,
        async (client: any) => {
          return await client.contact.upsert({
            where: {
              phone: leadData.phone,
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
        }
      );
    } catch (error) {
      this.logger.error('Failed to sync to contact:', error);
    }
  }

  private parseLeadFields(fieldData: any[]) {
    const parsed: any = { status: 'Intake', customFields: {} };
    
    this.logger.log('=== PARSING LEAD FIELDS ===');
    this.logger.log('Raw field data:', JSON.stringify(fieldData, null, 2));
    
    fieldData.forEach(field => {
      const name = field.name.toLowerCase();
      const values = field.values || [];
      
      this.logger.log(`Processing field: "${field.name}"`);
      this.logger.log(`  - Values array:`, values);
      this.logger.log(`  - First value:`, values[0]);
      
      if (name === 'full_name' || (name.includes('name') && !name.includes('company'))) {
        parsed.name = values[0];
      } else if (name.includes('email')) {
        parsed.email = values[0];
      } else if ((name.includes('phone') || name.includes('mobile')) && !name.includes('verified')) {
        // Only process phone fields that are NOT the "verified" field
        // Meta returns: phone_number (actual number) and phone_number_verified (true/false)
        
        this.logger.log(`  - PHONE FIELD DETECTED`);
        this.logger.log(`  - Values:`, JSON.stringify(values));
        
        const phoneValue = values[0];
        
        if (phoneValue && typeof phoneValue === 'string') {
          // Remove all non-digit characters to get clean phone number
          const cleanPhone = phoneValue.replace(/\D/g, '');
          
          // Check if it's a valid phone number (at least 10 digits)
          if (cleanPhone.length >= 10) {
            parsed.phone = cleanPhone;
            this.logger.log(`  - ✅ Extracted phone: ${cleanPhone} (from ${phoneValue})`);
          } else {
            this.logger.warn(`  - ⚠️ Phone too short: ${cleanPhone} (${cleanPhone.length} digits)`);
            parsed.phone = null;
          }
        } else {
          this.logger.warn(`  - ⚠️ Invalid phone value:`, phoneValue);
          parsed.phone = null;
        }
      } else if (name.includes('company')) {
        parsed.company = values[0];
      } else if (name.includes('city')) {
        parsed.city = values[0];
      } else if (name.includes('business') && name.includes('type')) {
        parsed.businessType = values[0];
      } else {
        // Store any other fields in customFields JSON
        parsed.customFields[field.name] = values[0];
      }
    });

    this.logger.log('=== PARSED RESULT ===');
    this.logger.log(JSON.stringify(parsed, null, 2));
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
        
        const client = await this.getClient(tenantId || 'default');
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
    const client = await this.getClient(tenantId || 'default');
    return client.masterConfig.findFirst({
      where: { isActive: true },
    });
  }

  async deleteAllLeads(tenantId?: string) {
    try {
      const client = await this.getClient(tenantId || 'default');
      const result = await client.metaLead.deleteMany({});
      this.logger.log(`✅ Deleted ${result.count} leads`);
      return { success: true, count: result.count };
    } catch (error) {
      this.logger.error('Failed to delete leads:', error);
      throw new Error(error.message || 'Failed to delete leads');
    }
  }

  async importLeadsFromCSV(csvData: any[], pageId: string, formId: string, phoneNumberId?: string, tenantId?: string) {
    try {
      const client = await this.getClient(tenantId || 'default');
      const savedLeads: any[] = [];
      let skipped = 0;

      this.logger.log(`Starting CSV import: ${csvData.length} rows`);

      for (const row of csvData) {
        try {
          const leadData: any = {
            status: 'Intake',
            customFields: {},
          };

          Object.keys(row).forEach(key => {
            const lowerKey = key.toLowerCase().trim();
            const value = row[key]?.toString().trim();
            
            if (!value) return;

            if (lowerKey.includes('name') || lowerKey === 'full_name') {
              if (!lowerKey.includes('company')) leadData.name = value;
            } else if (lowerKey.includes('email')) {
              leadData.email = value;
            } else if (lowerKey.includes('phone')) {
              leadData.phone = value;
            } else if (lowerKey.includes('company')) {
              leadData.company = value;
            } else if (lowerKey.includes('city')) {
              leadData.city = value;
            } else if (lowerKey.includes('business') && lowerKey.includes('type')) {
              leadData.businessType = value;
            } else if (lowerKey.includes('created') || lowerKey.includes('date')) {
              try {
                const parsedDate = new Date(value);
                if (!isNaN(parsedDate.getTime())) {
                  leadData.createdTime = parsedDate;
                }
              } catch (e) {}
            } else if (lowerKey.includes('id') && !lowerKey.includes('form') && !lowerKey.includes('page')) {
              leadData.leadId = value;
            } else {
              leadData.customFields[key] = value;
            }
          });

          if (!leadData.leadId) {
            leadData.leadId = `csv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          }

          if (!leadData.createdTime) {
            leadData.createdTime = new Date();
          }

          if (!leadData.name && !leadData.email && !leadData.phone) {
            skipped++;
            continue;
          }

          const saved = await client.metaLead.upsert({
            where: { leadId: leadData.leadId },
            update: {
              name: leadData.name,
              email: leadData.email,
              phone: leadData.phone,
              company: leadData.company,
              city: leadData.city,
              businessType: leadData.businessType,
              customFields: leadData.customFields,
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
              city: leadData.city,
              businessType: leadData.businessType,
              customFields: leadData.customFields,
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
