import { Controller, Post, Get, Body, HttpException, HttpStatus, ValidationPipe, UsePipes, Query } from '@nestjs/common';
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

  @Get('submissions')
  @ApiOperation({ 
    summary: 'Get all landing contact submissions',
    description: 'Retrieves paginated list of contact form submissions'
  })
  async getSubmissions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    try {
      const result = await this.landingContactService.getSubmissions(
        page ? parseInt(page) : 1,
        limit ? parseInt(limit) : 10,
        search || '',
      );
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch submissions',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
