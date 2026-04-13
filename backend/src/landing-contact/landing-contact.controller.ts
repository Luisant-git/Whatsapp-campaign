import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { LandingContactService } from './landing-contact.service';

export class SubmitContactDto {
  businessName: string;
  yourName: string;
  whatsappNumber: string;
  hasWebsite: string;
  primaryGoal: string;
}

@Controller('landing-contact')
export class LandingContactController {
  constructor(private readonly landingContactService: LandingContactService) {}

  @Post('submit')
  async submitContactForm(@Body() dto: SubmitContactDto) {
    const errors: any = {};

    if (!dto.businessName?.trim()) {
      errors.businessName = 'Business name is required';
    }

    if (!dto.yourName?.trim()) {
      errors.yourName = 'Your name is required';
    }

    if (!dto.whatsappNumber || !/^\+?[1-9]\d{1,14}$/.test(dto.whatsappNumber)) {
      errors.whatsappNumber = 'Valid WhatsApp number is required';
    }

    if (!['yes', 'no'].includes(dto.hasWebsite)) {
      errors.hasWebsite = 'Please select if you have a website';
    }

    if (!['marketing', 'ecommerce', 'appointment', 'all'].includes(dto.primaryGoal)) {
      errors.primaryGoal = 'Please select a primary goal';
    }

    if (Object.keys(errors).length > 0) {
      throw new HttpException(
        {
          success: false,
          message: 'Validation error',
          errors,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const result = await this.landingContactService.submitForm(dto);
      return {
        success: true,
        message: 'Form submitted successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to submit form',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
