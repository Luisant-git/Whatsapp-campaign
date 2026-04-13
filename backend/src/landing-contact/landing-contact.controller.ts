import { Controller, Post, Body, HttpException, HttpStatus, ValidationPipe, UsePipes } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { LandingContactService } from './landing-contact.service';
import { SubmitContactDto } from './dto/submit-contact.dto';

@ApiTags('Landing Contact')
@Controller('landing-contact')
export class LandingContactController {
  constructor(private readonly landingContactService: LandingContactService) {}

  @Post('submit')
  @ApiOperation({ 
    summary: 'Submit landing page contact form',
    description: 'Submits contact form data and sends WhatsApp welcome message'
  })
  @ApiBody({ type: SubmitContactDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Form submitted successfully',
    schema: {
      example: {
        success: true,
        message: 'Form submitted successfully',
        data: {
          submissionId: 123,
          whatsappMessageSent: true
        }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Validation error',
    schema: {
      example: {
        success: false,
        message: 'Validation error',
        errors: {
          whatsappNumber: 'Valid WhatsApp number is required'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Internal server error' 
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async submitContactForm(@Body() dto: SubmitContactDto) {
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
