import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  Query, 
  Param,
  UseInterceptors, 
  UploadedFile,
  UploadedFiles,
  HttpStatus,
  HttpException
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiQuery, ApiParam } from '@nestjs/swagger';
import { WhatsappService } from './whatsapp.service';
import { SendMessageDto, SendBulkDto, SendMediaDto, MessageResponseDto, BulkMessageResultDto, WhatsAppMessageDto, UploadResponseDto, AnalyticsDto, WhatsAppSettingsDto } from './dto';

@ApiTags('WhatsApp')
@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

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
              await this.whatsappService.handleIncomingMessage(message);
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
  @ApiOperation({ summary: 'Get WhatsApp messages' })
  @ApiQuery({ name: 'phone', required: false, description: 'Filter by phone number' })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully', type: [WhatsAppMessageDto] })
  async getMessages(@Query('phone') phone?: string) {
    return this.whatsappService.getMessages(phone);
  }

  @Post('send-message')
  @ApiOperation({ summary: 'Send a WhatsApp message' })
  @ApiResponse({ status: 201, description: 'Message sent successfully', type: MessageResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async sendMessage(@Body() sendMessageDto: SendMessageDto) {
    return this.whatsappService.sendMessage(sendMessageDto.to, sendMessageDto.message);
  }

  @Post('send-bulk')
  @ApiOperation({ summary: 'Send bulk WhatsApp messages using templates' })
  @ApiResponse({ status: 201, description: 'Bulk messages sent successfully', type: [BulkMessageResultDto] })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async sendBulk(@Body() sendBulkDto: SendBulkDto) {
    if (sendBulkDto.contacts) {
      return this.whatsappService.sendBulkTemplateMessageWithNames(
        sendBulkDto.contacts, 
        sendBulkDto.templateName
      );
    }
    return this.whatsappService.sendBulkTemplateMessage(
      sendBulkDto.phoneNumbers || [], 
      sendBulkDto.templateName, 
      sendBulkDto.parameters
    );
  }

  @Post('send-media')
  @ApiOperation({ summary: 'Send WhatsApp media message' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Media message sent successfully', type: MessageResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request' })
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

  @Get('analytics')
  @ApiOperation({ summary: 'Get WhatsApp analytics and statistics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully', type: AnalyticsDto })
  async getAnalytics() {
    return this.whatsappService.getAnalytics();
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get WhatsApp configuration settings' })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
  async getSettings() {
    return {
      templateName: process.env.WHATSAPP_DEFAULT_TEMPLATE || 'luisant_diwali_website50_v1',
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN ? '***masked***' : null,
      verifyToken: process.env.WHATSAPP_VERIFY_TOKEN ? '***masked***' : null,
      apiUrl: process.env.WHATSAPP_API_URL
    };
  }

  @Get('debug')
  @ApiOperation({ summary: 'Debug WhatsApp configuration' })
  async debugConfig() {
    return {
      hasApiUrl: !!process.env.WHATSAPP_API_URL,
      hasPhoneNumberId: !!process.env.WHATSAPP_PHONE_NUMBER_ID,
      hasAccessToken: !!process.env.WHATSAPP_ACCESS_TOKEN,
      apiUrl: process.env.WHATSAPP_API_URL,
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID
    };
  }
}