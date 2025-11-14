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
  UseGuards
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

  @Get('webhook')
  @ApiOperation({ summary: 'Verify WhatsApp webhook' })
  @ApiQuery({ name: 'hub.mode', required: true })
  @ApiQuery({ name: 'hub.verify_token', required: true })
  @ApiQuery({ name: 'hub.challenge', required: true })
  @ApiResponse({ status: 200, description: 'Webhook verified successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Invalid token' })
  verifyWebhook(@Query() query: any) {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      console.log('Webhook verified');
      return parseInt(challenge);
    }
    throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Handle incoming WhatsApp webhooks' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  async handleWebhook(@Body() body: any) {
    console.log('Webhook received:', JSON.stringify(body, null, 2));
    
    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages') {
            const message = change.value.messages?.[0];
            if (message) {
              console.log('Processing incoming message:', message);
              // For webhook, use a default userId or handle differently
              await this.whatsappService.handleIncomingMessage(message, 1);
            }
            const statuses = change.value.statuses;
            if (statuses) {
              for (const status of statuses) {
                await this.whatsappService.updateMessageStatus(status.id, status.status);
              }
            }
          }
        }
      }
      return 'EVENT_RECEIVED';
    }
    throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
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
  async sendBulk(@Session() session: any, @Body() sendBulkDto: SendBulkDto) {
    // Create campaign first
    const contacts = sendBulkDto.contacts || 
      (sendBulkDto.phoneNumbers || []).map(phone => ({ name: '', phone }));
    
    const campaignName = `Bulk Campaign - ${new Date().toLocaleDateString()}`;
    const campaign = await this.campaignService.createCampaign({
      name: campaignName,
      templateName: sendBulkDto.templateName,
      contacts,
      parameters: sendBulkDto.parameters
    }, session.user.id);

    // Run the campaign
    const result = await this.campaignService.runCampaign(campaign.id, session.user.id);
    
    return {
      campaignName,
      ...result
    };
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
      const allowedTypes = /jpeg|jpg|png|gif|mp4|avi|mov|pdf|doc|docx|mp3|wav/;
      const extname = allowedTypes.test(file.originalname.toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      
      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Invalid file type'), false);
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
      const allowedTypes = /jpeg|jpg|png|gif|mp4|avi|mov|pdf|doc|docx|mp3|wav|webp/;
      const extname = allowedTypes.test(file.originalname.toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      
      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Invalid file type'), false);
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
      const allowedTypes = /jpeg|jpg|png|gif|mp4|avi|mov|pdf|doc|docx|mp3|wav|webp/;
      const extname = allowedTypes.test(file.originalname.toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      
      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Invalid file type'), false);
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
  @ApiResponse({ status: 200, description: 'Campaigns retrieved successfully', type: [CampaignResponseDto] })
  async getCampaigns(@Session() session: any) {
    return this.campaignService.getCampaigns(session.user.id);
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

}