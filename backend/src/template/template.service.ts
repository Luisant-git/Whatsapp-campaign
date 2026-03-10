import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { CentralPrismaService } from '../central-prisma.service';
import { CreateTemplateDto, UpdateTemplateDto, TemplatePreviewDto, RequestReviewDto, TemplateCategory, TemplateStatus } from './dto/template.dto';
import axios from 'axios';

@Injectable()
export class TemplateService {
  constructor(private centralPrisma: CentralPrismaService) { }

  async createTemplate(userId: number, createTemplateDto: CreateTemplateDto) {
    const tenant = await this.getTenantWithCredentials(userId);

    try {
      console.log('Received template data:', JSON.stringify(createTemplateDto, null, 2));
      
      // Validate template content based on category
      this.validateTemplateByCategory(createTemplateDto);
      
      // Validate template structure for Meta API requirements
      this.validateTemplateStructure(createTemplateDto);

      // Ensure template name is valid (lowercase, underscores only)
      const baseName = createTemplateDto.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      
      // Check for existing template with same name and language
      const existingTemplate = await this.centralPrisma.messageTemplate.findFirst({
        where: {
          tenantId: tenant.id,
          name: baseName,
          language: createTemplateDto.language
        }
      });
      
      if (existingTemplate) {
        throw new BadRequestException(`Template with name '${baseName}' already exists in language '${createTemplateDto.language}'. Please use a different name.`);
      }
      
      const validName = baseName;
      
      // Process components to ensure proper format and add examples
      let processedComponents = createTemplateDto.components.map(component => {
        console.log('Processing component:', JSON.stringify(component, null, 2));
        
        if (component.type === 'HEADER') {
          if (component.text && !component.format) {
            const processedComponent = { ...component, format: 'TEXT' };
            // Add example if header has variables
            if (component.text.includes('{{')) {
              const variableCount = (component.text.match(/{{\d+}}/g) || []).length;
              (processedComponent as any).example = {
                header_text: [Array(variableCount).fill(0).map((_, i) => `Sample ${i + 1}`)]
              };
            }
            return processedComponent;
          }
          
          // Handle media headers (IMAGE, VIDEO, DOCUMENT)
          if (component.format && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(component.format)) {
            // If example exists, convert local path to full URL
            if (component.example && (component.example as any).header_handle) {
              const headerHandle = (component.example as any).header_handle[0];
              const fullUrl = headerHandle.startsWith('/uploads/') 
                ? `${process.env.BASE_URL || 'https://whatsapp.api.luisant.cloud'}${headerHandle}`
                : headerHandle;
              
              return {
                type: 'HEADER',
                format: component.format,
                example: {
                  header_handle: [fullUrl]
                }
              };
            }
            // If no example, add a valid placeholder URL
            return {
              type: 'HEADER',
              format: component.format,
              example: {
                header_handle: ['https://via.placeholder.com/400x300.png']
              }
            };
          }
        }
        
        if (component.type === 'BODY' && component.text && component.text.includes('{{')) {
          const variableCount = (component.text.match(/{{\d+}}/g) || []).length;
          return {
            ...component,
            example: {
              body_text: [[...Array(variableCount).fill(0).map((_, i) => `Sample ${i + 1}`)]]
            }
          };
        }
        
        if (component.type === 'BUTTONS' && component.buttons) {
          const processedButtons = component.buttons.map(button => {
            if (button.type === 'URL') {
              return {
                type: 'URL',
                text: button.text || 'Visit Website',
                url: button.url || 'https://example.com'
              };
            }
            if (button.type === 'PHONE_NUMBER') {
              return {
                type: 'PHONE_NUMBER',
                text: button.text || 'Call Us',
                phone_number: button.phone_number || '+1234567890'
              };
            }
            return {
              type: 'QUICK_REPLY',
              text: button.text || 'Reply'
            };
          });
          return {
            ...component,
            buttons: processedButtons
          };
        }
        
        return component;
      });

      // Reorder components: HEADER, BODY, FOOTER, BUTTONS (Meta requires this order)
      const componentOrder = { HEADER: 0, BODY: 1, FOOTER: 2, BUTTONS: 3 };
      processedComponents = processedComponents.sort((a, b) => 
        (componentOrder[a.type] || 99) - (componentOrder[b.type] || 99)
      );

      console.log('Final processed components:', JSON.stringify(processedComponents, null, 2));

      const metaPayload = {
        name: validName,
        category: createTemplateDto.category.toLowerCase(),
        language: createTemplateDto.language,
        components: processedComponents
      };

      console.log('Sending to Meta API:', JSON.stringify(metaPayload, null, 2));

      // Create template via Meta API using correct format
      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${tenant.wabaId}/message_templates`,
        metaPayload,
        {
          headers: {
            Authorization: `Bearer ${tenant.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Store template in database
      const template = await this.centralPrisma.messageTemplate.create({
        data: {
          tenantId: tenant.id,
          templateId: response.data.id,
          name: validName,
          category: createTemplateDto.category,
          language: createTemplateDto.language,
          status: TemplateStatus.IN_REVIEW,
          components: JSON.stringify(createTemplateDto.components),
          createdAt: new Date(),
        },
      });

      return {
        success: true,
        templateId: response.data.id,
        status: response.data.status,
        template,
      };
    } catch (error) {
      console.error('Template creation error:', error.response?.data || error.message);
      throw new BadRequestException(
        error.response?.data?.error?.message || error.message || 'Failed to create template'
      );
    }
  }

  async getTemplates(userId: number, status?: TemplateStatus, category?: TemplateCategory) {
    const tenant = await this.getTenantWithCredentials(userId);
    const where: any = { tenantId: tenant.id };
    if (status) where.status = status;
    if (category) where.category = category;

    return this.centralPrisma.messageTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTemplate(userId: number, templateId: string) {
    const tenant = await this.getTenantWithCredentials(userId);
    const template = await this.centralPrisma.messageTemplate.findFirst({
      where: { tenantId: tenant.id, templateId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  async updateTemplate(userId: number, templateId: string, updateTemplateDto: UpdateTemplateDto) {
    const tenant = await this.getTenantWithCredentials(userId);
    
    // Try to find template by templateId first, then by database id
    let template = await this.centralPrisma.messageTemplate.findFirst({
      where: { tenantId: tenant.id, templateId },
    });
    
    if (!template && !isNaN(Number(templateId))) {
      // Try finding by database id only if templateId is a valid number
      template = await this.centralPrisma.messageTemplate.findFirst({
        where: { tenantId: tenant.id, id: Number(templateId) },
      });
    }

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    try {
      // Update template via Meta API
      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${template.templateId}`,
        updateTemplateDto,
        {
          headers: {
            Authorization: `Bearer ${tenant.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Update in database
      const updatedTemplate = await this.centralPrisma.messageTemplate.update({
        where: { id: template.id },
        data: {
          category: updateTemplateDto.category || template.category,
          components: updateTemplateDto.components
            ? JSON.stringify(updateTemplateDto.components)
            : template.components,
          status: TemplateStatus.IN_REVIEW,
          updatedAt: new Date(),
        },
      });

      return {
        success: true,
        template: updatedTemplate,
      };
    } catch (error) {
      throw new BadRequestException(
        error.response?.data?.error?.message || 'Failed to update template'
      );
    }
  }

  async deleteTemplate(userId: number, templateId: string) {
    const tenant = await this.getTenantWithCredentials(userId);
    
    // Try to find template by templateId first, then by database id
    let template = await this.centralPrisma.messageTemplate.findFirst({
      where: { tenantId: tenant.id, templateId },
    });
    
    if (!template && !isNaN(Number(templateId))) {
      // Try finding by database id only if templateId is a valid number
      template = await this.centralPrisma.messageTemplate.findFirst({
        where: { tenantId: tenant.id, id: Number(templateId) },
      });
    }

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    try {
      // Delete from Meta API if it's a real template ID
      if (template.templateId && !template.templateId.startsWith('template_')) {
        await axios.delete(
          `https://graph.facebook.com/v18.0/${template.templateId}`,
          {
            headers: {
              Authorization: `Bearer ${tenant.accessToken}`,
            },
          }
        );
      }

      // Delete from database
      await this.centralPrisma.messageTemplate.delete({
        where: { id: template.id },
      });

      return { success: true };
    } catch (error) {
      // If Meta API fails, still delete from database
      await this.centralPrisma.messageTemplate.delete({
        where: { id: template.id },
      });
      
      return { 
        success: true, 
        warning: 'Template deleted locally but may still exist on Meta servers'
      };
    }
  }

  async previewTemplate(previewDto: TemplatePreviewDto) {
    // Validate template structure
    this.validateTemplateByCategory(previewDto);

    // Generate preview with sample values
    const preview = this.generateTemplatePreview(previewDto);

    return {
      preview,
      validation: this.validateTemplateContent(previewDto),
      categoryGuidelines: this.getCategoryGuidelines(previewDto.category),
    };
  }

  async requestReview(userId: number, requestReviewDto: RequestReviewDto) {
    const tenant = await this.getTenantWithCredentials(userId);
    const templates = await this.centralPrisma.messageTemplate.findMany({
      where: {
        tenantId: tenant.id,
        templateId: { in: requestReviewDto.templateIds },
      },
    });

    if (templates.length !== requestReviewDto.templateIds.length) {
      throw new BadRequestException('Some templates not found');
    }

    // Update templates to indicate review requested
    await this.centralPrisma.messageTemplate.updateMany({
      where: {
        tenantId: tenant.id,
        templateId: { in: requestReviewDto.templateIds },
      },
      data: {
        reviewRequested: true,
        reviewRequestedAt: new Date(),
        reviewReason: requestReviewDto.reason,
      },
    });

    return {
      success: true,
      message: 'Review request submitted successfully',
      templatesCount: templates.length,
    };
  }

  async syncTemplateStatus(userId: number) {
    const tenant = await this.getTenantWithCredentials(userId);

    try {
      // Fetch templates from Meta API
      const response = await axios.get(
        `https://graph.facebook.com/v18.0/${tenant.wabaId}/message_templates`,
        {
          headers: {
            Authorization: `Bearer ${tenant.accessToken}`,
          },
        }
      );

      const metaTemplates = response.data.data;

      // Update local database with latest status
      for (const metaTemplate of metaTemplates) {
        // Map Meta status to our enum
        let status = TemplateStatus.IN_REVIEW;
        switch (metaTemplate.status) {
          case 'APPROVED':
            status = TemplateStatus.ACTIVE;
            break;
          case 'REJECTED':
            status = TemplateStatus.REJECTED;
            break;
          case 'PENDING':
          case 'IN_APPEAL':
          default:
            status = TemplateStatus.IN_REVIEW;
            break;
        }

        await this.centralPrisma.messageTemplate.updateMany({
          where: {
            tenantId: tenant.id,
            OR: [
              { templateId: metaTemplate.id },
              { name: metaTemplate.name, language: metaTemplate.language }
            ]
          },
          data: {
            status,
            templateId: metaTemplate.id,
            category: metaTemplate.category?.toUpperCase(),
            updatedAt: new Date(),
          },
        });
      }

      return {
        success: true,
        syncedCount: metaTemplates.length,
      };
    } catch (error) {
      throw new BadRequestException('Failed to sync template status');
    }
  }

  async getTemplateLibrary() {
    // Return predefined authentication templates from Meta
    return {
      authentication: [
        {
          name: 'verification_code',
          components: [
            {
              type: 'BODY',
              text: '{{1}} is your verification code.',
              example: { body_text: [['123456']] },
            },
          ],
        },
        {
          name: 'login_code',
          components: [
            {
              type: 'BODY',
              text: 'Your login code is {{1}}. Do not share this code.',
              example: { body_text: [['987654']] },
            },
          ],
        },
      ],
    };
  }

  private validateTemplateStructure(template: CreateTemplateDto | TemplatePreviewDto) {
    const bodyComponent = template.components.find(c => c.type === 'BODY');
    
    if (bodyComponent?.text) {
      const text = bodyComponent.text.trim();
      
      // Check if variables are at start or end
      if (text.match(/^\{\{\d+\}\}/) || text.match(/\{\{\d+\}\}$/)) {
        throw new BadRequestException('Variables cannot be at the start or end of the message. Add some text before/after the variable.');
      }
      
      // Check for consecutive variables
      if (text.match(/\{\{\d+\}\}\s*\{\{\d+\}\}/)) {
        throw new BadRequestException('Variables cannot be consecutive. Add text between variables.');
      }
      
      // Check variable numbering (must be sequential starting from 1)
      const variables = text.match(/\{\{(\d+)\}\}/g);
      if (variables) {
        const numbers = variables.map(v => {
          const match = v.match(/\d+/);
          return match ? parseInt(match[0]) : 0;
        }).sort((a, b) => a - b);
        for (let i = 0; i < numbers.length; i++) {
          if (numbers[i] !== i + 1) {
            throw new BadRequestException(`Variables must be numbered sequentially starting from {{1}}. Found {{${numbers[i]}}} but expected {{${i + 1}}}.`);
          }
        }
      }
    }
    
    // Validate header component
    const headerComponent = template.components.find(c => c.type === 'HEADER');
    if (headerComponent?.text && headerComponent.text.length > 60) {
      throw new BadRequestException('Header text cannot exceed 60 characters.');
    }
    
    // Validate footer component
    const footerComponent = template.components.find(c => c.type === 'FOOTER');
    if (footerComponent?.text && footerComponent.text.length > 60) {
      throw new BadRequestException('Footer text cannot exceed 60 characters.');
    }
    
    // Validate body length
    if (bodyComponent?.text && bodyComponent.text.length > 1024) {
      throw new BadRequestException('Body text cannot exceed 1024 characters.');
    }
  }

  private validateTemplateByCategory(template: CreateTemplateDto | TemplatePreviewDto) {
    switch (template.category) {
      case TemplateCategory.AUTHENTICATION:
        this.validateAuthenticationTemplate(template);
        break;
      case TemplateCategory.UTILITY:
        this.validateUtilityTemplate(template);
        break;
      case TemplateCategory.MARKETING:
        this.validateMarketingTemplate(template);
        break;
    }
  }

  private validateAuthenticationTemplate(template: CreateTemplateDto | TemplatePreviewDto) {
    const bodyComponent = template.components.find(c => c.type === 'BODY');
    if (!bodyComponent?.text) {
      throw new BadRequestException('Authentication templates must have a body text');
    }

    // Check for OTP pattern
    if (!bodyComponent.text.includes('{{1}}')) {
      throw new BadRequestException('Authentication templates must include a parameter for the code');
    }

    // Validate character limit for parameters (15 chars max)
    const hasMedia = template.components.some(c => c.type === 'HEADER' && c.format);
    if (hasMedia) {
      throw new BadRequestException('Authentication templates cannot contain media');
    }
  }

  private validateUtilityTemplate(template: CreateTemplateDto | TemplatePreviewDto) {
    const bodyComponent = template.components.find(c => c.type === 'BODY');
    if (!bodyComponent?.text) {
      throw new BadRequestException('Utility templates must have body text');
    }

    // Check for promotional content
    const promotionalKeywords = ['offer', 'discount', 'sale', 'promo', 'buy now', 'limited time'];
    const text = bodyComponent.text.toLowerCase();

    if (promotionalKeywords.some(keyword => text.includes(keyword))) {
      throw new BadRequestException('Utility templates cannot contain promotional content');
    }
  }

  private validateMarketingTemplate(template: CreateTemplateDto | TemplatePreviewDto) {
    const bodyComponent = template.components.find(c => c.type === 'BODY');
    if (!bodyComponent?.text) {
      throw new BadRequestException('Marketing templates must have body text');
    }
  }

  private generateTemplatePreview(template: TemplatePreviewDto) {
    let preview = '';

    for (const component of template.components) {
      switch (component.type) {
        case 'HEADER':
          if (component.format === 'TEXT') {
            preview += `*${this.replaceParameters(component.text || '', template.sampleValues)}*\n\n`;
          } else if (component.format === 'IMAGE') {
            preview += '[IMAGE]\n\n';
          }
          break;
        case 'BODY':
          preview += `${this.replaceParameters(component.text || '', template.sampleValues)}\n\n`;
          break;
        case 'FOOTER':
          preview += `_${component.text}_\n\n`;
          break;
        case 'BUTTONS':
          if (component.buttons) {
            preview += 'Buttons:\n';
            component.buttons.forEach((btn: any, index: number) => {
              preview += `${index + 1}. ${btn.text}\n`;
            });
          }
          break;
      }
    }

    return preview.trim();
  }

  private replaceParameters(text: string, sampleValues?: string[]): string {
    if (!sampleValues) return text;

    let result = text;
    sampleValues.forEach((value, index) => {
      result = result.replace(new RegExp(`\\{\\{${index + 1}\\}\\}`, 'g'), value);
    });

    return result;
  }

  private validateTemplateContent(template: TemplatePreviewDto) {
    const issues: string[] = [];

    // Check for required components
    const hasBody = template.components.some(c => c.type === 'BODY');
    if (!hasBody) {
      issues.push('Template must have a BODY component');
    }

    // Check parameter count
    const bodyComponent = template.components.find(c => c.type === 'BODY');
    if (bodyComponent?.text) {
      const paramCount = (bodyComponent.text.match(/\{\{\d+\}\}/g) || []).length;
      if (paramCount > 10) {
        issues.push('Maximum 10 parameters allowed in body text');
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  private getCategoryGuidelines(category: TemplateCategory) {
    const guidelines = {
      [TemplateCategory.MARKETING]: {
        description: 'Enable businesses to achieve goals from generating awareness to driving sales',
        examples: ['Promotional offers', 'Product announcements', 'Event invitations'],
        restrictions: ['Most flexible category', 'Can include promotional content'],
      },
      [TemplateCategory.UTILITY]: {
        description: 'Follow up on user actions or requests, typically triggered by user actions',
        examples: ['Order confirmations', 'Account alerts', 'Feedback surveys'],
        restrictions: ['Must be non-promotional', 'Must be specific to user or essential/critical'],
      },
      [TemplateCategory.AUTHENTICATION]: {
        description: 'Verify user identity with alphanumeric codes at various customer journey steps',
        examples: ['OTP codes', 'Login verification', 'Account recovery'],
        restrictions: ['No URLs, media, or emojis', 'Parameters limited to 15 characters', 'Must use Template Library'],
      },
    };

    return guidelines[category];
  }

  private async getTenantWithCredentials(userId: number) {
    const tenant = await this.centralPrisma.tenant.findUnique({
      where: { id: userId },
    });

    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    // If tenant has direct credentials, use them
    if (tenant.accessToken && tenant.wabaId) {
      return tenant;
    }

    throw new BadRequestException('WhatsApp Business API credentials not configured. Please add WABA ID and Access Token to your tenant configuration.');
  }

  async syncCredentialsFromMasterConfig(userId: number, masterConfigId: number) {
    // This would need tenant context to access master config
    // For now, credentials must be set directly on tenant
    throw new BadRequestException('Please configure credentials directly on tenant record');
  }
}