import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { CentralPrismaService } from '../central-prisma.service';
import { TenantPrismaService } from '../tenant-prisma.service';
import { CreateTemplateDto, UpdateTemplateDto, TemplatePreviewDto, RequestReviewDto, TemplateCategory, TemplateStatus } from './dto/template.dto';
import axios from 'axios';

@Injectable()
export class TemplateService {
  constructor(
    private centralPrisma: CentralPrismaService,
    private tenantPrisma: TenantPrismaService
  ) { }

  async createTemplate(userId: number, createTemplateDto: CreateTemplateDto) {
    const { tenant, tenantClient, masterConfig } = await this.getTenantWithCredentials(userId);

    try {
      console.log('Received template data:', JSON.stringify(createTemplateDto, null, 2));
      
      // Validate that wabaId exists
      if (!masterConfig.wabaId) {
        throw new BadRequestException('WhatsApp Business Account ID (wabaId) is not configured. Please update your Master Config.');
      }
      
      // Validate template content based on category
      this.validateTemplateByCategory(createTemplateDto);
      
      // Validate template structure for Meta API requirements
      this.validateTemplateStructure(createTemplateDto);

      // Ensure template name is valid (lowercase, underscores only)
      const baseName = createTemplateDto.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      
      // Check for existing template with same name and language
      const existingTemplate = await tenantClient.messageTemplate.findFirst({
        where: {
          name: baseName,
          language: createTemplateDto.language
        }
      });
      
      if (existingTemplate) {
        throw new BadRequestException(`Template with name '${baseName}' already exists in language '${createTemplateDto.language}'. Please use a different name.`);
      }
      
      const validName = baseName;
      
      // Process components to ensure proper format and add examples
      const processedComponents = await Promise.all(
        createTemplateDto.components.map(async (component) => {
        console.log('Processing component:', JSON.stringify(component, null, 2));
        
        if (component.type === 'HEADER') {
          if (component.text && !component.format) {
            const processedComponent = { ...component, format: 'TEXT' };
            // Add example if header has variables
            if (component.text.includes('{{')) {
              const variableCount = (component.text.match(/{{\d+}}/g) || []).length;
              (processedComponent as any).example = {
                header_text: [Array(variableCount).fill(0).map((_, i) => {
                  const sampleValue = createTemplateDto.sampleValues?.[i + 1];
                  return sampleValue || `Sample ${i + 1}`;
                })]
              };
            }
            return processedComponent;
          }
          
          // Handle media headers (IMAGE, VIDEO, DOCUMENT)  
          if (component.format && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(component.format)) {
            // For media headers, we need to upload and get asset handle
            if (component.example && (component.example as any).header_handle) {
              const localPath = (component.example as any).header_handle[0];
              
              // Upload media to Meta and get the asset handle for template creation
              const assetHandle = await this.uploadTemplateMedia(masterConfig, localPath);
              
              return {
                type: 'HEADER',
                format: component.format,
                example: {
                  header_handle: [assetHandle]
                }
              };
            }
            
            throw new BadRequestException(`${component.format} header requires a sample media file`);
          }
        }
        
        if (component.type === 'BODY' && component.text && component.text.includes('{{')) {
          const variableCount = (component.text.match(/{{\d+}}/g) || []).length;
          return {
            ...component,
            example: {
              body_text: [[...Array(variableCount).fill(0).map((_, i) => {
                const sampleValue = createTemplateDto.sampleValues?.[i + 1];
                return sampleValue || `Sample ${i + 1}`;
              })]]
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
              // Validate phone number format
              if (!button.phone_number) {
                throw new BadRequestException('Phone number is required for PHONE_NUMBER button type');
              }
              // Ensure phone number starts with + and country code
              const phoneNumber = button.phone_number.startsWith('+') 
                ? button.phone_number 
                : `+${button.phone_number}`;
              
              return {
                type: 'PHONE_NUMBER',
                text: button.text || 'Call Us',
                phone_number: phoneNumber
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
      })
      );

      // Reorder components: HEADER, BODY, FOOTER, BUTTONS (Meta requires this order)
      const order = ['HEADER', 'BODY', 'FOOTER', 'BUTTONS'];
      const sortedComponents = processedComponents.sort(
        (a, b) => order.indexOf(a.type) - order.indexOf(b.type)
      );

      console.log('Final processed components:', JSON.stringify(sortedComponents, null, 2));

      const metaPayload = {
        name: validName,
        category: createTemplateDto.category.toUpperCase(), // Meta expects uppercase
        language: createTemplateDto.language, // Use language code as-is from frontend
        components: sortedComponents
      };

      console.log('Sending to Meta API:', JSON.stringify(metaPayload, null, 2));

      // Create template via Meta API using correct format
      const response = await axios.post(
        `https://graph.facebook.com/v21.0/${masterConfig.wabaId}/message_templates`,
        metaPayload,
        {
          headers: {
            Authorization: `Bearer ${masterConfig.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Store template in database
      const template = await tenantClient.messageTemplate.create({
        data: {
          templateId: response.data.id,
          name: validName,
          category: createTemplateDto.category,
          language: createTemplateDto.language,
          status: TemplateStatus.IN_REVIEW,
          components: JSON.stringify(createTemplateDto.components),
          sampleValues: createTemplateDto.sampleValues ? JSON.stringify(createTemplateDto.sampleValues) : null,
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
    const { tenantClient } = await this.getTenantWithCredentials(userId);
    const where: any = {};
    if (status) where.status = status;
    if (category) where.category = category;

    return tenantClient.messageTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTemplate(userId: number, templateId: string) {
    const { tenantClient } = await this.getTenantWithCredentials(userId);
    const template = await tenantClient.messageTemplate.findFirst({
      where: { templateId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  async updateTemplate(userId: number, templateId: string, updateTemplateDto: UpdateTemplateDto) {
    const { tenantClient, masterConfig } = await this.getTenantWithCredentials(userId);
    
    // Try to find template by templateId first, then by database id
    let template = await tenantClient.messageTemplate.findFirst({
      where: { templateId },
    });
    
    if (!template && !isNaN(Number(templateId))) {
      // Try finding by database id only if templateId is a valid number
      template = await tenantClient.messageTemplate.findFirst({
        where: { id: Number(templateId) },
      });
    }

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    try {
      console.log('Updating template:', template.templateId);
      console.log('Update data:', JSON.stringify(updateTemplateDto, null, 2));
      
      // Validate the update data if components are provided
      if (updateTemplateDto.components) {
        this.validateTemplateStructure({
          name: updateTemplateDto.name || template.name,
          category: updateTemplateDto.category || template.category as TemplateCategory,
          language: updateTemplateDto.language || template.language,
          components: updateTemplateDto.components
        });
      }
      
      // For Meta templates, use delete-and-recreate method (Meta doesn't support direct updates)
      if (template.templateId && !template.templateId.startsWith('template_')) {
        console.log('Deleting old template from Meta:', {
          templateId: template.templateId,
          templateName: template.name,
          wabaId: masterConfig.wabaId
        });
        
        try {
          // Step 1: Delete old template from Meta using WABA ID + template name
          await axios.delete(
            `https://graph.facebook.com/v21.0/${masterConfig.wabaId}/message_templates`,
            {
              params: {
                name: template.name,
              },
              headers: {
                Authorization: `Bearer ${masterConfig.accessToken}`,
              },
            }
          );
          console.log('Old template deleted from Meta successfully');
        } catch (deleteError) {
          console.warn('Failed to delete old template from Meta:', deleteError.response?.data);
          // Continue anyway - we'll create the new template with a modified name
        }
        
        // Step 2: Create new template with updated data
        // Try to use the original name first, only add version if there's a conflict
        const desiredName = updateTemplateDto.name || template.name;
        let newTemplateName = desiredName;
        let createAttempt = 0;
        let templateCreated = false;
        let response;
        
        const createTemplateData = {
          name: newTemplateName,
          category: updateTemplateDto.category || template.category as TemplateCategory,
          language: updateTemplateDto.language || template.language,
          components: updateTemplateDto.components || JSON.parse(template.components || '[]')
        };
        
        // Process components for Meta API
        const processedComponents = await Promise.all(
          createTemplateData.components.map(async (component: any) => {
            if (component.type === 'HEADER') {
              if (component.text && !component.format) {
                const processedComponent = { ...component, format: 'TEXT' };
                if (component.text.includes('{{')) {
                  const variableCount = (component.text.match(/{{\d+}}/g) || []).length;
                  (processedComponent as any).example = {
                    header_text: [Array(variableCount).fill(0).map((_, i) => {
                      const sampleValue = updateTemplateDto.sampleValues?.[i + 1];
                      return sampleValue || `Sample ${i + 1}`;
                    })]
                  };
                }
                return processedComponent;
              }
              
              if (component.format && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(component.format)) {
                if (component.example && (component.example as any).header_handle) {
                  const localPath = (component.example as any).header_handle[0];
                  const assetHandle = await this.uploadTemplateMedia(masterConfig, localPath);
                  
                  return {
                    type: 'HEADER',
                    format: component.format,
                    example: {
                      header_handle: [assetHandle]
                    }
                  };
                }
                throw new BadRequestException(`${component.format} header requires a sample media file`);
              }
            }
            
            if (component.type === 'BODY' && component.text && component.text.includes('{{')) {
              const variableCount = (component.text.match(/{{\d+}}/g) || []).length;
              return {
                ...component,
                example: {
                  body_text: [[...Array(variableCount).fill(0).map((_, i) => {
                    const sampleValue = updateTemplateDto.sampleValues?.[i + 1];
                    return sampleValue || `Sample ${i + 1}`;
                  })]]
                }
              };
            }
            
            if (component.type === 'BUTTONS' && component.buttons) {
              const processedButtons = component.buttons.map((button: any) => {
                if (button.type === 'URL') {
                  return {
                    type: 'URL',
                    text: button.text || 'Visit Website',
                    url: button.url || 'https://example.com'
                  };
                }
                if (button.type === 'PHONE_NUMBER') {
                  const phoneNumber = button.phone_number?.startsWith('+') 
                    ? button.phone_number 
                    : `+${button.phone_number}`;
                  
                  return {
                    type: 'PHONE_NUMBER',
                    text: button.text || 'Call Us',
                    phone_number: phoneNumber
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
          })
        );
        
        // Reorder components
        const order = ['HEADER', 'BODY', 'FOOTER', 'BUTTONS'];
        const sortedComponents = processedComponents.sort(
          (a, b) => order.indexOf(a.type) - order.indexOf(b.type)
        );
        
        // Try creating template with original name first, then with versioned names if conflicts occur
        while (!templateCreated && createAttempt < 5) {
          try {
            const metaPayload = {
              name: newTemplateName,
              category: createTemplateData.category.toUpperCase(),
              language: createTemplateData.language,
              components: sortedComponents
            };
            
            console.log(`Attempt ${createAttempt + 1}: Creating template with name '${newTemplateName}'`);
            console.log('Sending to Meta API:', JSON.stringify(metaPayload, null, 2));
            
            // Step 3: Create new template on Meta
            response = await axios.post(
              `https://graph.facebook.com/v21.0/${masterConfig.wabaId}/message_templates`,
              metaPayload,
              {
                headers: {
                  Authorization: `Bearer ${masterConfig.accessToken}`,
                  'Content-Type': 'application/json',
                },
              }
            );
            
            console.log('Template created successfully on Meta:', response.data);
            templateCreated = true;
            
          } catch (createError) {
            console.log(`Template creation attempt ${createAttempt + 1} failed:`, createError.response?.data);
            
            // If it's a name conflict, try with a versioned name
            if (createError.response?.data?.error?.message?.includes('already exists') || 
                createError.response?.data?.error?.message?.includes('duplicate')) {
              createAttempt++;
              
              // Generate next version number by checking existing templates
              const nextVersion = await this.getNextVersionNumber(tenantClient, desiredName, createTemplateData.language);
              newTemplateName = `${desiredName}_v${nextVersion}`;
              console.log(`Name conflict detected, trying with versioned name: ${newTemplateName}`);
            } else {
              // If it's not a name conflict, throw the error
              throw createError;
            }
          }
        }
        
        if (!templateCreated) {
          throw new BadRequestException('Failed to create template after multiple attempts due to name conflicts');
        }
        
        // Update database with new template ID and name
        const updatedTemplate = await tenantClient.messageTemplate.update({
          where: { id: template.id },
          data: {
            templateId: response.data.id,
            name: newTemplateName, // Use the actual name that was created (original or versioned)
            category: createTemplateData.category,
            language: createTemplateData.language,
            components: JSON.stringify(createTemplateData.components),
            sampleValues: updateTemplateDto.sampleValues ? JSON.stringify(updateTemplateDto.sampleValues) : (template.sampleValues || null),
            status: TemplateStatus.IN_REVIEW, // New template needs approval again
            updatedAt: new Date(),
          },
        });
        
        // Create user-friendly message
        const isOriginalName = newTemplateName === desiredName;
        const message = isOriginalName 
          ? `Template updated successfully. Status: PENDING (requires Meta approval)`
          : `Template updated successfully with name '${newTemplateName}' (original name had conflicts). Status: PENDING (requires Meta approval)`;
        
        return {
          success: true,
          template: updatedTemplate,
          message,
          newTemplateId: response.data.id,
          newTemplateName: newTemplateName,
          originalNameUsed: isOriginalName,
          method: 'delete_and_recreate'
        };
      } else {
        // Local template only - just update database
        const updatedTemplate = await tenantClient.messageTemplate.update({
          where: { id: template.id },
          data: {
            name: updateTemplateDto.name || template.name,
            category: updateTemplateDto.category || template.category,
            language: updateTemplateDto.language || template.language,
            components: updateTemplateDto.components
              ? JSON.stringify(updateTemplateDto.components)
              : template.components,
            sampleValues: updateTemplateDto.sampleValues ? JSON.stringify(updateTemplateDto.sampleValues) : (template.sampleValues || null),
            status: TemplateStatus.IN_REVIEW,
            updatedAt: new Date(),
          },
        });
        
        return {
          success: true,
          template: updatedTemplate,
          message: 'Local template updated successfully'
        };
      }
    } catch (error) {
      console.error('Template update error:', error.response?.data || error.message);
      throw new BadRequestException(
        error.response?.data?.error?.message || error.message || 'Failed to update template'
      );
    }
  }

  async deleteTemplate(userId: number, templateId: string) {
    const { tenantClient, masterConfig } = await this.getTenantWithCredentials(userId);
    
    // Try to find template by templateId first, then by database id
    let template = await tenantClient.messageTemplate.findFirst({
      where: { templateId },
    });
    
    if (!template && !isNaN(Number(templateId))) {
      // Try finding by database id only if templateId is a valid number
      template = await tenantClient.messageTemplate.findFirst({
        where: { id: Number(templateId) },
      });
    }

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    console.log('Deleting template:', {
      databaseId: template.id,
      templateId: template.templateId,
      name: template.name
    });

    let metaDeleteSuccess = false;
    let metaError: string | null = null;

    try {
      // Delete from Meta API if it's a real template ID (not a local placeholder)
      if (template.templateId && !template.templateId.startsWith('template_')) {
        console.log('Deleting from Meta API using WABA ID + template name:', {
          wabaId: masterConfig.wabaId,
          templateName: template.name
        });
        
        const response = await axios.delete(
          `https://graph.facebook.com/v21.0/${masterConfig.wabaId}/message_templates`,
          {
            params: {
              name: template.name,
            },
            headers: {
              Authorization: `Bearer ${masterConfig.accessToken}`,
            },
          }
        );
        
        console.log('Meta API delete response:', response.data);
        metaDeleteSuccess = true;
      } else {
        console.log('Skipping Meta API delete - local template only');
        metaDeleteSuccess = true; // Consider it successful for local-only templates
      }
    } catch (error) {
      console.error('Meta API delete error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      metaError = error.response?.data?.error?.message || error.message;
      
      // Check if template is in use
      if (metaError && (metaError.includes('template in use') || metaError.includes('Permissions error'))) {
        throw new BadRequestException(
          `Cannot delete template '${template.name}' because it is currently in use in running campaigns or automation flows. ` +
          `Please stop all campaigns using this template before deleting it.`
        );
      }
      
      // Don't proceed with database deletion if Meta deletion failed
      throw new BadRequestException(
        `Failed to delete template from WhatsApp: ${metaError}. ` +
        `Template not deleted to maintain consistency. Please try again or contact support if the issue persists.`
      );
    }

    try {
      // Only delete from database if Meta deletion was successful
      await tenantClient.messageTemplate.delete({
        where: { id: template.id },
      });

      console.log('Template deleted successfully from both Meta and database');
      
      return { 
        success: true,
        message: 'Template deleted successfully from WhatsApp and local database'
      };
    } catch (dbError) {
      console.error('Database delete error after successful Meta delete:', dbError);
      
      // This is a critical situation - template deleted from Meta but not from DB
      throw new BadRequestException(
        'Template was deleted from WhatsApp but failed to delete from local database. ' +
        'Please contact support to resolve this inconsistency.'
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
    const { tenantClient } = await this.getTenantWithCredentials(userId);
    const templates = await tenantClient.messageTemplate.findMany({
      where: {
        templateId: { in: requestReviewDto.templateIds },
      },
    });

    if (templates.length !== requestReviewDto.templateIds.length) {
      throw new BadRequestException('Some templates not found');
    }

    // Update templates to indicate review requested
    await tenantClient.messageTemplate.updateMany({
      where: {
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
    const { tenantClient, masterConfig } = await this.getTenantWithCredentials(userId);

    try {
      // Validate that wabaId exists
      if (!masterConfig.wabaId) {
        throw new BadRequestException('WhatsApp Business Account ID (wabaId) is not configured. Please update your Master Config.');
      }
      
      // Fetch templates from Meta API
      const response = await axios.get(
        `https://graph.facebook.com/v21.0/${masterConfig.wabaId}/message_templates`,
        {
          headers: {
            Authorization: `Bearer ${masterConfig.accessToken}`,
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

        // Update in tenant database (not central)
        await tenantClient.messageTemplate.updateMany({
          where: {
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
      console.error('Sync error:', error.response?.data || error.message);
      throw new BadRequestException(
        error.response?.data?.error?.message || 'Failed to sync template status'
      );
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
      
      // Check if variables are at start or end (support both numbered and named variables)
      if (text.match(/^\{\{[a-zA-Z0-9_]+\}\}/) || text.match(/\{\{[a-zA-Z0-9_]+\}\}$/)) {
        throw new BadRequestException('Variables cannot be at the start or end of the message. Add some text before/after the variable.');
      }
      
      // Check for consecutive variables
      if (text.match(/\{\{[a-zA-Z0-9_]+\}\}\s*\{\{[a-zA-Z0-9_]+\}\}/)) {
        throw new BadRequestException('Variables cannot be consecutive. Add text between variables.');
      }
      
      // Check variable numbering for numbered variables (must be sequential starting from 1)
      const numberedVariables = text.match(/\{\{(\d+)\}\}/g);
      if (numberedVariables) {
        const numbers = numberedVariables.map(v => {
          const match = v.match(/\d+/);
          return match ? parseInt(match[0]) : 0;
        }).sort((a, b) => a - b);
        for (let i = 0; i < numbers.length; i++) {
          if (numbers[i] !== i + 1) {
            throw new BadRequestException(`Variables must be numbered sequentially starting from {{1}}. Found {{${numbers[i]}}} but expected {{${i + 1}}}.`);
          }
        }
      }
      
      // Check all variables (both numbered and named)
      const allVariables = text.match(/\{\{[a-zA-Z0-9_]+\}\}/g);
      if (allVariables) {
        // Check variable density - Meta's rule: too many variables for message length
        const textWithoutVariables = text.replace(/\{\{[a-zA-Z0-9_]+\}\}/g, '');
        const variableCount = allVariables.length;
        const textLength = textWithoutVariables.length;
        
        // Meta's approximate rule: For every 10-15 characters of text, you can have 1 variable
        // This is a conservative estimate based on Meta's validation
        const maxVariablesForLength = Math.floor(textLength / 10);
        
        if (variableCount > maxVariablesForLength && textLength < 30) {
          throw new BadRequestException(
            `This template has too many variables for its length. ` +
            `Reduce the number of variables (currently ${variableCount}) or increase the message length. ` +
            `Variables can't be at the start or end of the template.`
          );
        }
        
        // Additional check: minimum text between variables
        const parts = text.split(/\{\{[a-zA-Z0-9_]+\}\}/);
        for (let i = 1; i < parts.length - 1; i++) {
          if (parts[i].trim().length < 2) {
            throw new BadRequestException('There must be at least 2 characters of text between variables.');
          }
        }
        
        // Check first and last parts have sufficient text
        if (parts[0].trim().length < 2) {
          throw new BadRequestException('There must be at least 2 characters of text before the first variable.');
        }
        if (parts[parts.length - 1].trim().length < 2) {
          throw new BadRequestException('There must be at least 2 characters of text after the last variable.');
        }
      }
    }
    
    // Validate header component
    const headerComponent = template.components.find(c => c.type === 'HEADER');
    if (headerComponent?.text) {
      // Same rules apply to header text
      const text = headerComponent.text.trim();
      
      if (text.match(/^\{\{[a-zA-Z0-9_]+\}\}/) || text.match(/\{\{[a-zA-Z0-9_]+\}\}$/)) {
        throw new BadRequestException('Header variables cannot be at the start or end. Add text before/after the variable.');
      }
      
      if (text.match(/\{\{[a-zA-Z0-9_]+\}\}\s*\{\{[a-zA-Z0-9_]+\}\}/)) {
        throw new BadRequestException('Header variables cannot be consecutive. Add text between variables.');
      }
      
      if (headerComponent.text.length > 60) {
        throw new BadRequestException('Header text cannot exceed 60 characters.');
      }
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

    // Get tenant database connection
    const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
    const tenantClient = this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);

    // Get active Master Config from tenant database
    const masterConfig = await tenantClient.masterConfig.findFirst({
      where: { isActive: true },
      orderBy: { id: 'desc' }
    });

    if (!masterConfig) {
      throw new BadRequestException('Master Config not found. Please configure WhatsApp API credentials.');
    }

    console.log('Master Config loaded:', {
      id: masterConfig.id,
      name: masterConfig.name,
      phoneNumberId: masterConfig.phoneNumberId,
      wabaId: masterConfig.wabaId,
      appId: masterConfig.appId,
      hasAccessToken: !!masterConfig.accessToken
    });

    return { tenant, tenantClient, masterConfig };
  }

  async syncCredentialsFromMasterConfig(userId: number, masterConfigId: number) {
    // This would need tenant context to access master config
    // For now, credentials must be set directly on tenant
    throw new BadRequestException('Please configure credentials directly on tenant record');
  }



  private async uploadTemplateMedia(masterConfig: any, localPath: string): Promise<string> {
    const fs = require('fs');
    const path = require('path');

    try {
      console.log('Uploading media for template creation, localPath:', localPath);
      
      // Validate that appId exists
      if (!masterConfig.appId) {
        throw new BadRequestException(
          'Meta App ID is not configured. Please add appId to your Master Config. ' +
          'You can find your App ID in Meta Developer Console.'
        );
      }
      
      // Convert local path to full file path
      const fullPath = localPath.startsWith('/uploads/') 
        ? path.join(process.cwd(), 'uploads', path.basename(localPath))
        : localPath;

      console.log('Full file path:', fullPath);

      // Check if file exists
      if (!fs.existsSync(fullPath)) {
        console.error('File not found:', fullPath);
        throw new BadRequestException(`Media file not found: ${fullPath}`);
      }

      const fileStats = fs.statSync(fullPath);
      const fileBuffer = fs.readFileSync(fullPath);
      const mimeType = this.getMimeType(fullPath);
      console.log('File size:', fileStats.size, 'bytes');
      console.log('MIME type:', mimeType);
      console.log('App ID:', masterConfig.appId);

      // Step 1: Create upload session using APP ID (not WABA ID)
      console.log('Step 1: Creating upload session with App ID...');
      const sessionResponse = await axios.post(
        `https://graph.facebook.com/v21.0/${masterConfig.appId}/uploads`,
        {
          file_length: fileStats.size,
          file_type: mimeType,
          file_name: path.basename(fullPath)
        },
        {
          headers: {
            Authorization: `Bearer ${masterConfig.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const uploadSessionId = sessionResponse.data.id;
      console.log('Upload session created, ID:', uploadSessionId);

      // Step 2: Upload file data to the session
      console.log('Step 2: Uploading file data to session...');
      const uploadResponse = await axios.post(
        `https://graph.facebook.com/v21.0/${uploadSessionId}`,
        fileBuffer,
        {
          headers: {
            Authorization: `Bearer ${masterConfig.accessToken}`,
            'Content-Type': 'application/octet-stream',
            'file_offset': '0',
          },
        }
      );

      // Step 3: Extract the handle (h) from response
      const assetHandle = uploadResponse.data.h;
      
      if (!assetHandle) {
        console.error('No handle returned from upload. Response:', uploadResponse.data);
        throw new BadRequestException('Upload succeeded but no asset handle was returned');
      }
      
      console.log('Asset handle retrieved:', assetHandle);
      return assetHandle;
      
    } catch (error) {
      console.error('Template media upload error:');
      console.error('Error message:', error.message);
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
      console.error('Request URL:', error.config?.url);
      
      // Provide helpful error message
      const errorMsg = error.response?.data?.error?.message || error.message;
      const errorDetails = error.response?.data?.error?.error_user_title || '';
      
      throw new BadRequestException(
        `Template media upload failed: ${errorMsg}${errorDetails ? ' - ' + errorDetails : ''}. ` +
        `Make sure: 1) Your access token has 'whatsapp_business_management' permission, ` +
        `2) Your App ID is correct (find it in Meta Developer Console), ` +
        `3) The access token belongs to the same app as the App ID.`
      );
    }
  }

  private async uploadMediaToMeta(masterConfig: any, localPath: string): Promise<string> {
    const fs = require('fs');
    const FormData = require('form-data');
    const path = require('path');

    try {
      console.log('Uploading media for message sending, localPath:', localPath);
      
      // Convert local path to full file path
      const fullPath = localPath.startsWith('/uploads/') 
        ? path.join(process.cwd(), 'uploads', path.basename(localPath))
        : localPath;

      console.log('Full file path:', fullPath);

      // Check if file exists
      if (!fs.existsSync(fullPath)) {
        console.error('File not found:', fullPath);
        throw new BadRequestException(`Media file not found: ${fullPath}`);
      }

      const fileStats = fs.statSync(fullPath);
      console.log('File size:', fileStats.size, 'bytes');

      // Create form data for media upload
      const formData = new FormData();
      formData.append('file', fs.createReadStream(fullPath));
      formData.append('type', this.getMimeType(fullPath));
      formData.append('messaging_product', 'whatsapp');

      console.log('Uploading to Meta API...');
      console.log('Phone Number ID:', masterConfig.phoneNumberId);
      console.log('File type:', this.getMimeType(fullPath));

      // Upload media to Meta using phoneNumberId (for sending messages)
      const uploadResponse = await axios.post(
        `https://graph.facebook.com/v21.0/${masterConfig.phoneNumberId}/media`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${masterConfig.accessToken}`,
            ...formData.getHeaders(),
          },
        }
      );

      const mediaId = uploadResponse.data.id;
      console.log('Media uploaded successfully, ID:', mediaId);
      return mediaId;
      
    } catch (error) {
      console.error('Media upload error details:');
      console.error('Error message:', error.message);
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
      
      throw new BadRequestException(`Media upload failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  private async getMediaUrl(masterConfig: any, mediaId: string): Promise<string> {
    try {
      console.log('Fetching media URL for ID:', mediaId);
      
      // Get media URL from Meta API
      const response = await axios.get(
        `https://graph.facebook.com/v21.0/${mediaId}`,
        {
          headers: {
            Authorization: `Bearer ${masterConfig.accessToken}`,
          },
        }
      );

      const mediaUrl = response.data.url;
      console.log('Media URL retrieved:', mediaUrl);
      return mediaUrl;
      
    } catch (error) {
      console.error('Get media URL error:', error.response?.data || error.message);
      throw new BadRequestException(`Failed to get media URL: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  private getMimeType(filePath: string): string {
    const ext = filePath.toLowerCase().split('.').pop();
    const mimeTypes: { [key: string]: string } = {
      // Images
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      // Videos
      'mp4': 'video/mp4',
      'avi': 'video/x-msvideo',
      'mov': 'video/quicktime',
      // Documents
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  private async getNextVersionNumber(tenantClient: any, baseName: string, language: string): Promise<number> {
    // Find all existing templates with the same base name and language
    const existingTemplates = await tenantClient.messageTemplate.findMany({
      where: {
        name: {
          startsWith: baseName
        },
        language: language
      },
      select: {
        name: true
      }
    });
    
    // Extract version numbers from existing template names
    const versionNumbers: number[] = [];
    
    for (const template of existingTemplates) {
      if (template.name === baseName) {
        // Original template without version
        versionNumbers.push(0);
      } else if (template.name.startsWith(`${baseName}_v`)) {
        // Versioned template
        const versionMatch = template.name.match(new RegExp(`^${baseName}_v(\\d+)$`));
        if (versionMatch) {
          versionNumbers.push(parseInt(versionMatch[1]));
        }
      }
    }
    
    // Find the next available version number
    let nextVersion = 1;
    while (versionNumbers.includes(nextVersion)) {
      nextVersion++;
    }
    
    return nextVersion;
  }
}