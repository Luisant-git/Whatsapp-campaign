import { Injectable } from '@nestjs/common';
import { CentralPrismaService } from '../central-prisma.service';

@Injectable()
export class TemplateWebhookService {
  constructor(private centralPrisma: CentralPrismaService) {}

  async handleTemplateStatusUpdate(webhookData: any) {
    try {
      const { entry } = webhookData;
      
      for (const entryItem of entry) {
        const { changes } = entryItem;
        
        for (const change of changes) {
          if (change.field === 'message_template_status_update') {
            await this.processTemplateStatusUpdate(change.value);
          }
          
          if (change.field === 'template_category_update') {
            await this.processTemplateCategoryUpdate(change.value);
          }
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error processing template webhook:', error);
      throw error;
    }
  }

  private async processTemplateStatusUpdate(value: any) {
    const { message_template_id, event, reason } = value;
    
    await this.centralPrisma.messageTemplate.updateMany({
      where: { templateId: message_template_id },
      data: {
        status: event,
        updatedAt: new Date(),
        ...(reason && { rejectionReason: reason }),
      },
    });
    
    console.log(`Template ${message_template_id} status updated to ${event}`);
  }

  private async processTemplateCategoryUpdate(value: any) {
    const { message_template_id, new_category, previous_category } = value;
    
    await this.centralPrisma.messageTemplate.updateMany({
      where: { templateId: message_template_id },
      data: {
        category: new_category,
        previousCategory: previous_category,
        updatedAt: new Date(),
      },
    });
    
    console.log(`Template ${message_template_id} category updated from ${previous_category} to ${new_category}`);
  }
}