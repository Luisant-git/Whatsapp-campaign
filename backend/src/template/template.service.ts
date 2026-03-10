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
      // Validate template content based on category
      this.validateTemplateByCategory(createTemplateDto);

      // Create template via Meta API
      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${tenant.wabaId}/message_templates`,
        {
          name: createTemplateDto.name,
          category: createTemplateDto.category,
          language: createTemplateDto.language,
          components: createTemplateDto.components,
          allow_category_change: createTemplateDto.allowCategoryChange || true,
        },
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
          name: createTemplateDto.name,
          category: createTemplateDto.category,
          language: createTemplateDto.language,
          status: TemplateStatus.PENDING,
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
      throw new BadRequestException(
        error.response?.data?.error?.message || 'Failed to create template'
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
    const template = await this.getTemplate(userId, templateId);

    try {
      // Update template via Meta API
      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${templateId}`,
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
          status: TemplateStatus.PENDING,
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
    const template = await this.getTemplate(userId, templateId);

    try {
      // Delete template via Meta API
      await axios.delete(
        `https://graph.facebook.com/v18.0/${templateId}`,
        {
          headers: {
            Authorization: `Bearer ${tenant.accessToken}`,
          },
        }
      );

      // Delete from database
      await this.centralPrisma.messageTemplate.delete({
        where: { id: template.id },
      });

      return { success: true };
    } catch (error) {
      throw new BadRequestException(
        error.response?.data?.error?.message || 'Failed to delete template'
      );
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
        await this.centralPrisma.messageTemplate.updateMany({
          where: {
            tenantId: tenant.id,
            templateId: metaTemplate.id,
          },
          data: {
            status: metaTemplate.status,
            category: metaTemplate.category,
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

    if (!tenant?.accessToken || !tenant?.wabaId) {
      throw new BadRequestException('WhatsApp Business API credentials not configured');
    }

    return tenant;
  }
}