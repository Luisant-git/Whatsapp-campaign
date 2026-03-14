import { Injectable } from '@nestjs/common';
import { CentralPrismaService } from '../central-prisma.service';
import { TenantPrismaService } from '../tenant-prisma.service';

@Injectable()
export class TemplateWebhookService {
  constructor(
    private centralPrisma: CentralPrismaService,
    private tenantPrisma: TenantPrismaService
  ) {}

  async handleTemplateStatusUpdate(webhookData: any, tenantId?: number) {
    try {
      const { entry } = webhookData;
      
      for (const entryItem of entry) {
        const { changes } = entryItem;
        
        for (const change of changes) {
          if (change.field === 'message_template_status_update') {
            await this.processTemplateStatusUpdate(change.value, tenantId);
          }
          
          if (change.field === 'template_category_update') {
            await this.processTemplateCategoryUpdate(change.value, tenantId);
          }
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error processing template webhook:', error);
      throw error;
    }
  }

  private async processTemplateStatusUpdate(value: any, tenantId?: number) {
    const { message_template_id, event, reason, message_template_name } = value;
    
    console.log(`Processing template status update:`, {
      templateId: message_template_id,
      templateName: message_template_name,
      event,
      reason,
      tenantId
    });
    
    if (tenantId) {
      // Update in tenant database
      const tenant = await this.centralPrisma.tenant.findUnique({
        where: { id: tenantId }
      });
      
      if (tenant) {
        const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
        const tenantClient = this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);
        
        await tenantClient.messageTemplate.updateMany({
          where: { 
            OR: [
              { templateId: message_template_id },
              { name: message_template_name }
            ]
          },
          data: {
            status: event,
            updatedAt: new Date(),
            ...(reason && { rejectionReason: reason }),
          },
        });
        
        console.log(`✅ Template ${message_template_name} (${message_template_id}) status updated to ${event} in tenant ${tenantId} database`);
      }
    } else {
      // Fallback: try to update in all tenant databases (less efficient but works)
      console.log('⚠️ No tenant ID provided, trying to update in all tenant databases');
      
      const tenants = await this.centralPrisma.tenant.findMany();
      
      for (const tenant of tenants) {
        try {
          const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
          const tenantClient = this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);
          
          const updateResult = await tenantClient.messageTemplate.updateMany({
            where: { 
              OR: [
                { templateId: message_template_id },
                { name: message_template_name }
              ]
            },
            data: {
              status: event,
              updatedAt: new Date(),
              ...(reason && { rejectionReason: reason }),
            },
          });
          
          if (updateResult.count > 0) {
            console.log(`✅ Template ${message_template_name} updated in tenant ${tenant.id} database (${updateResult.count} records)`);
          }
        } catch (error) {
          console.error(`Error updating template in tenant ${tenant.id}:`, error.message);
        }
      }
    }
  }

  private async processTemplateCategoryUpdate(value: any, tenantId?: number) {
    const { message_template_id, new_category, previous_category, message_template_name } = value;
    
    console.log(`Processing template category update:`, {
      templateId: message_template_id,
      templateName: message_template_name,
      newCategory: new_category,
      previousCategory: previous_category,
      tenantId
    });
    
    if (tenantId) {
      // Update in tenant database
      const tenant = await this.centralPrisma.tenant.findUnique({
        where: { id: tenantId }
      });
      
      if (tenant) {
        const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
        const tenantClient = this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);
        
        await tenantClient.messageTemplate.updateMany({
          where: { 
            OR: [
              { templateId: message_template_id },
              { name: message_template_name }
            ]
          },
          data: {
            category: new_category,
            previousCategory: previous_category,
            updatedAt: new Date(),
          },
        });
        
        console.log(`✅ Template ${message_template_name} category updated from ${previous_category} to ${new_category} in tenant ${tenantId} database`);
      }
    } else {
      // Fallback: try to update in all tenant databases
      console.log('⚠️ No tenant ID provided, trying to update in all tenant databases');
      
      const tenants = await this.centralPrisma.tenant.findMany();
      
      for (const tenant of tenants) {
        try {
          const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
          const tenantClient = this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);
          
          const updateResult = await tenantClient.messageTemplate.updateMany({
            where: { 
              OR: [
                { templateId: message_template_id },
                { name: message_template_name }
              ]
            },
            data: {
              category: new_category,
              previousCategory: previous_category,
              updatedAt: new Date(),
            },
          });
          
          if (updateResult.count > 0) {
            console.log(`✅ Template ${message_template_name} category updated in tenant ${tenant.id} database (${updateResult.count} records)`);
          }
        } catch (error) {
          console.error(`Error updating template category in tenant ${tenant.id}:`, error.message);
        }
      }
    }
  }
}