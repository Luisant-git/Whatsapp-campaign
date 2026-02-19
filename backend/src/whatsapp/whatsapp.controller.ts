import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Query,
  Param,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  HttpStatus,
  HttpException,
  Session,
  UseGuards,
  Res
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiQuery, ApiParam } from '@nestjs/swagger';
import { WhatsappService } from './whatsapp.service';
import { CampaignService } from './campaign.service';
import { SendMessageDto, SendBulkDto, SendMediaDto, MessageResponseDto, BulkMessageResultDto, WhatsAppMessageDto, UploadResponseDto, AnalyticsDto, WhatsAppSettingsDto, CreateCampaignDto, UpdateCampaignDto, CampaignResponseDto } from './dto';
import { SessionGuard } from '../auth/session.guard';
 
@ApiTags('WhatsApp')
@Controller('whatsapp')
export class WhatsappController {
  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly campaignService: CampaignService
  ) {}
 
  @Get('webhook/:verifyToken')
  @ApiOperation({ summary: 'Verify WhatsApp webhook' })
  @ApiParam({ name: 'verifyToken', required: true, description: 'Verify token from settings' })
  @ApiQuery({ name: 'hub.mode', required: true })
  @ApiQuery({ name: 'hub.verify_token', required: true })
  @ApiQuery({ name: 'hub.challenge', required: true })
  @ApiResponse({ status: 200, description: 'Webhook verified successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Invalid token' })
  async verifyWebhook(@Param('verifyToken') verifyToken: string, @Query() query: any) {
    console.log('\n=== WEBHOOK GET CALLED ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('URL Param - verifyToken:', verifyToken);
    console.log('Query Params:', JSON.stringify(query, null, 2));
   
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];
   
    console.log('Mode:', mode);
    console.log('Token from query:', token);
    console.log('Token from URL:', verifyToken);
    console.log('Tokens match:', token === verifyToken);
 
    if (mode === 'subscribe' && token === verifyToken) {
      const isValidToken = await this.whatsappService.validateVerifyToken(verifyToken);
      console.log('Token valid in database:', isValidToken);
      if (isValidToken) {
        console.log('✓ Webhook verified successfully for token:', verifyToken);
        return parseInt(challenge);
      }
    }
    console.log('✗ Webhook verification failed');
    throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
  }
 
  // Catch-all for debugging - remove after testing
  @Get('webhook')
  @ApiOperation({ summary: 'Catch-all webhook GET for debugging' })
  async catchAllWebhookGet(@Query() query: any) {
    console.log('\n⚠️ WEBHOOK GET CALLED WITHOUT TOKEN PARAMETER');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Query Params:', JSON.stringify(query, null, 2));
    console.log('This means Meta is calling the OLD webhook URL');
    console.log('Please update Meta Console with: /whatsapp/webhook/YOUR_TOKEN');
    throw new HttpException('Forbidden - Token required in URL', HttpStatus.FORBIDDEN);
  }
 
  @Post('webhook/:verifyToken')
  @ApiOperation({ summary: 'Handle incoming WhatsApp webhooks' })
  @ApiParam({ name: 'verifyToken', required: true, description: 'Verify token from settings' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  async handleWebhook(@Param('verifyToken') verifyToken: string, @Body() body: any) {
    try {
      console.log('\n=== WEBHOOK POST RECEIVED ===');
      console.log('Timestamp:', new Date().toISOString());
      console.log('Verify Token:', verifyToken);
      console.log('Body:', JSON.stringify(body, null, 2));
     
      if (!body || !body.object) {
        console.log('⚠️ Empty or invalid webhook body');
        return 'EVENT_RECEIVED';
      }
     
      if (body.object === 'whatsapp_business_account') {
        for (const entry of body.entry) {
          for (const change of entry.changes) {
            if (change.field === 'messages') {
              const message = change.value.messages?.[0];
              if (message) {
                try {
                  console.log('Processing incoming message:', message);
                  const phoneNumberId = change.value.metadata?.phone_number_id;
                  console.log('Phone Number ID:', phoneNumberId);
                 
                  let userId = await this.whatsappService.findUserByVerifyToken(verifyToken);
                  console.log('User ID from verify token:', userId);
                  
                  if (!userId) {
                    const userIds = await this.whatsappService.findAllUsersByPhoneNumberId(phoneNumberId);
                    console.log('User IDs from phone number ID:', userIds);
                    userId = userIds.length > 0 ? userIds[0] : null;
                  }
                  
                  if (!userId) {
                    userId = await this.whatsappService.findFirstActiveUser();
                    console.log('Fallback user ID:', userId);
                  }
                 
                  if (userId) {
                    console.log(`✓ Processing message for user ID: ${userId}`);
                    await this.whatsappService.handleIncomingMessage(message, userId);
                  } else {
                    console.log('✗ No user found for phone number ID:', phoneNumberId);
                  }
                } catch (msgError) {
                  console.error('Error processing message:', msgError);
                }
              }
              
              const statuses = change.value.statuses;
              if (statuses) {
                for (const status of statuses) {
                  try {
                    await this.whatsappService.updateMessageStatus(status.id, status.status);
                  } catch (statusError) {
                    console.error('Error updating status:', statusError);
                  }
                }
              }
            }
          }
        }
        return 'EVENT_RECEIVED';
      }
      throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
    } catch (error) {
      console.error('Webhook error:', error);
      return 'EVENT_RECEIVED';
    }
  }
 
  @Post('webhook')
  @ApiOperation({ summary: 'Handle webhook without token parameter' })
  async catchAllWebhookPost(@Body() body: any) {
    try {
      console.log('\n⚠️ WEBHOOK POST WITHOUT TOKEN');
      console.log('Timestamp:', new Date().toISOString());
      console.log('Body:', JSON.stringify(body, null, 2));
     
      if (!body || !body.object) {
        return 'EVENT_RECEIVED';
      }
     
      if (body.object === 'whatsapp_business_account') {
        for (const entry of body.entry) {
          for (const change of entry.changes) {
            if (change.field === 'messages') {
              const message = change.value.messages?.[0];
              if (message) {
                try {
                  const phoneNumberId = change.value.metadata?.phone_number_id;
                  console.log('Processing message for phone number ID:', phoneNumberId);
                  
                  await this.whatsappService.handleIncomingMessageWithoutContext(message, phoneNumberId);
                } catch (msgError) {
                  console.error('Error processing message:', msgError);
                }
              }
              
              const statuses = change.value.statuses;
              if (statuses) {
                for (const status of statuses) {
                  try {
                    await this.whatsappService.updateMessageStatusWithoutContext(status.id, status.status, change.value.metadata?.phone_number_id);
                  } catch (statusError) {
                    console.error('Error updating status:', statusError);
                  }
                }
              }
            }
          }
        }
      }
      return 'EVENT_RECEIVED';
    } catch (error) {
      console.error('Webhook error:', error);
      return 'EVENT_RECEIVED';
    }
  }
 
  @Get('messages')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Get WhatsApp messages' })
  @ApiQuery({ name: 'phone', required: false, description: 'Filter by phone number' })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully', type: [WhatsAppMessageDto] })
  async getMessages(@Session() session: any, @Query('phone') phone?: string) {
    return this.whatsappService.getMessages(session.user.id, phone);
  }
 
  @Post('send-message')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Send a WhatsApp message' })
  @ApiResponse({ status: 201, description: 'Message sent successfully', type: MessageResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async sendMessage(@Session() session: any, @Body() sendMessageDto: SendMessageDto) {
    return this.whatsappService.sendMessage(sendMessageDto.to, sendMessageDto.message, session.user.id);
  }
 
  @Post('send-bulk')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Send bulk WhatsApp messages using templates and create campaign' })
  @ApiResponse({ status: 201, description: 'Bulk messages sent successfully', type: [BulkMessageResultDto] })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async sendBulk(@Session() session: any, @Body() body: any) {
    // Handle nested structure from frontend
    const sendBulkDto = body.contacts || body;
   
    let contacts = [];
   
    if (Array.isArray(sendBulkDto.contacts)) {
      contacts = sendBulkDto.contacts;
    } else if (Array.isArray(sendBulkDto.phoneNumbers)) {
      contacts = sendBulkDto.phoneNumbers.map(phone => ({ name: '', phone }));
    } else {
      throw new Error('No valid contacts provided');
    }
   
    const campaignName = body.name || sendBulkDto.name || `Bulk Campaign - ${new Date().toLocaleDateString()}`;
    const campaign = await this.campaignService.createCampaign({
      name: campaignName,
      templateName: sendBulkDto.templateName,
      contacts,
      parameters: sendBulkDto.parameters,
      scheduleType: sendBulkDto.scheduleType || 'one-time',
      scheduledDays: sendBulkDto.scheduledDays || [],
      scheduledTime: sendBulkDto.scheduledTime,
      groupId: sendBulkDto.groupId, // ✅ Added this line
    }, session.user.id);
 
    // If one-time, run immediately; if time-based, just return campaign info
    if (sendBulkDto.scheduleType === 'time-based') {
      return {
        campaignName,
        campaignId: campaign.id,
        status: 'scheduled',
        message: 'Campaign scheduled successfully'
      };
    } else {
      // Run the campaign immediately
      const result = await this.campaignService.runCampaign(campaign.id, session.user.id);
     
      return {
        campaignName,
        ...result
      };
    }
  }
 
  @Post('send-media')
  @ApiOperation({ summary: 'Send WhatsApp media message' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Media message sent successfully', type: MessageResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @UseGuards(SessionGuard)
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
      }
    }),
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|avi|mov|mkv|pdf|doc|docx|xls|xlsx|ppt|pptx|mp3|wav|ogg|aac|m4a/;
      const extname = allowedTypes.test(file.originalname.toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype) ||
                       file.mimetype.includes('document') ||
                       file.mimetype.includes('spreadsheet') ||
                       file.mimetype.includes('presentation');
     
      if (mimetype || extname) {
        return cb(null, true);
      } else {
        cb(new Error('Invalid file type. Supported: images, videos, audio, PDF, DOC, XLS, PPT'), false);
      }
    },
    limits: {
      fileSize: 16 * 1024 * 1024 // 16MB limit
    }
  }))
  async sendMedia(
    @Session() session: any,
    @UploadedFile() file: any,
    @Body() sendMediaDto: SendMediaDto
  ) {
    if (!file) {
      throw new HttpException('File is required', HttpStatus.BAD_REQUEST);
    }
 
    const mediaUrl = `${process.env.UPLOAD_URL}/${file.filename}`;
    const mediaType = file.mimetype.startsWith('image') ? 'image' :
                      file.mimetype.startsWith('video') ? 'video' :
                      file.mimetype.startsWith('audio') ? 'audio' : 'document';
   
    return this.whatsappService.sendMediaMessage(
      sendMediaDto.to,
      mediaUrl,
      mediaType,
      session.user.id,
      sendMediaDto.caption
    );
  }
 
  @Get('message-status/:messageId')
  @ApiOperation({ summary: 'Get message status by ID' })
  @ApiParam({ name: 'messageId', description: 'WhatsApp message ID' })
  @ApiResponse({ status: 200, description: 'Message status retrieved successfully' })
  async getMessageStatus(@Param('messageId') messageId: string) {
    return this.whatsappService.getMessageStatus(messageId);
  }
 
  @Post('upload')
  @ApiOperation({ summary: 'Upload media file for WhatsApp' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'File uploaded successfully', type: UploadResponseDto })
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
      }
    }),
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|avi|mov|mkv|pdf|doc|docx|xls|xlsx|ppt|pptx|mp3|wav|ogg|aac|m4a/;
      const extname = allowedTypes.test(file.originalname.toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype) ||
                       file.mimetype.includes('document') ||
                       file.mimetype.includes('spreadsheet') ||
                       file.mimetype.includes('presentation');
     
      if (mimetype || extname) {
        return cb(null, true);
      } else {
        cb(new Error('Invalid file type. Supported: images, videos, audio, PDF, DOC, XLS, PPT'), false);
      }
    },
    limits: {
      fileSize: 16 * 1024 * 1024 // 16MB limit
    }
  }))
  async uploadFile(@UploadedFile() file: any) {
    if (!file) {
      throw new HttpException('File is required', HttpStatus.BAD_REQUEST);
    }
 
    const mediaUrl = `${process.env.UPLOAD_URL}/${file.filename}`;
    const mediaType = file.mimetype.startsWith('image') ? 'image' :
                      file.mimetype.startsWith('video') ? 'video' :
                      file.mimetype.startsWith('audio') ? 'audio' : 'document';
   
    return {
      success: true,
      filename: file.filename,
      originalName: file.originalname,
      mediaUrl,
      mediaType,
      size: file.size,
      mimetype: file.mimetype
    };
  }
 
  @Post('upload-multiple')
  @ApiOperation({ summary: 'Upload multiple media files for WhatsApp' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Files uploaded successfully', type: [UploadResponseDto] })
  @UseInterceptors(FilesInterceptor('files', 10, {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
      }
    }),
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|avi|mov|mkv|pdf|doc|docx|xls|xlsx|ppt|pptx|mp3|wav|ogg|aac|m4a/;
      const extname = allowedTypes.test(file.originalname.toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype) ||
                       file.mimetype.includes('document') ||
                       file.mimetype.includes('spreadsheet') ||
                       file.mimetype.includes('presentation');
     
      if (mimetype || extname) {
        return cb(null, true);
      } else {
        cb(new Error('Invalid file type. Supported: images, videos, audio, PDF, DOC, XLS, PPT'), false);
      }
    },
    limits: {
      fileSize: 16 * 1024 * 1024 // 16MB limit per file
    }
  }))
  async uploadMultipleFiles(@UploadedFiles() files: any[]) {
    if (!files || files.length === 0) {
      throw new HttpException('At least one file is required', HttpStatus.BAD_REQUEST);
    }
 
    const results = files.map(file => {
      const mediaUrl = `${process.env.UPLOAD_URL}/${file.filename}`;
      const mediaType = file.mimetype.startsWith('image') ? 'image' :
                        file.mimetype.startsWith('video') ? 'video' :
                        file.mimetype.startsWith('audio') ? 'audio' : 'document';
     
      return {
        success: true,
        filename: file.filename,
        originalName: file.originalname,
        mediaUrl,
        mediaType,
        size: file.size,
        mimetype: file.mimetype
      };
    });
 
    return results;
  }
 
  // Campaign endpoints
  @Post('campaigns')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Create a new campaign' })
  @ApiResponse({ status: 201, description: 'Campaign created successfully', type: CampaignResponseDto })
  async createCampaign(@Session() session: any, @Body() createCampaignDto: CreateCampaignDto) {
    return this.campaignService.createCampaign(createCampaignDto, session.user.id);
  }
 
  @Get('campaigns')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Get all campaigns' })
  @ApiQuery({ name: 'settingsName', required: false, description: 'Filter by settings name' })
  @ApiResponse({ status: 200, description: 'Campaigns retrieved successfully', type: [CampaignResponseDto] })
  async getCampaigns(@Session() session: any, @Query('settingsName') settingsName?: string) {
    return this.campaignService.getCampaigns(session.user.id, settingsName);
  }
 
  @Get('campaigns/:id')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Get campaign by ID' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({ status: 200, description: 'Campaign retrieved successfully', type: CampaignResponseDto })
  async getCampaign(@Session() session: any, @Param('id') id: string) {
    return this.campaignService.getCampaign(parseInt(id), session.user.id);
  }
 
  @Put('campaigns/:id')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Update campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({ status: 200, description: 'Campaign updated successfully', type: CampaignResponseDto })
  async updateCampaign(@Session() session: any, @Param('id') id: string, @Body() updateCampaignDto: UpdateCampaignDto) {
    return this.campaignService.updateCampaign(parseInt(id), updateCampaignDto, session.user.id);
  }
 
  @Post('campaigns/:id/run')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Run/Rerun campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({ status: 200, description: 'Campaign executed successfully' })
  async runCampaign(@Session() session: any, @Param('id') id: string) {
    return this.campaignService.runCampaign(parseInt(id), session.user.id);
  }
 
  @Delete('campaigns/:id')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Delete campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({ status: 200, description: 'Campaign deleted successfully' })
  async deleteCampaign(@Session() session: any, @Param('id') id: string) {
    return this.campaignService.deleteCampaign(parseInt(id), session.user.id);
  }
 
  @Get('campaigns/scheduled')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Get scheduled campaigns' })
  @ApiResponse({ status: 200, description: 'Scheduled campaigns retrieved successfully' })
  async getScheduledCampaigns(@Session() session: any) {
    return this.campaignService.getCampaigns(session.user.id).then(campaigns =>
      campaigns.filter(c => c.status === 'scheduled')
    );
  }
 
  @Get('campaigns/:id/results')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Get campaign results with response tracking' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({ status: 200, description: 'Campaign results retrieved successfully' })
  async getCampaignResults(@Session() session: any, @Param('id') id: string) {
    return this.campaignService.getCampaignResults(parseInt(id), session.user.id);
  }
 
  @Get('campaigns/:id/results/download')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Download campaign results as CSV or Excel' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiQuery({ name: 'format', enum: ['csv', 'xlsx'], description: 'Download format' })
  @ApiResponse({ status: 200, description: 'Campaign results file downloaded' })
  async downloadCampaignResults(
    @Session() session: any,
    @Param('id') id: string,
    @Query('format') format: 'csv' | 'xlsx' = 'csv',
    @Res() res: any
  ) {
    const result = await this.campaignService.downloadCampaignResults(parseInt(id), session.user.id, format);
   
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  }
 
}