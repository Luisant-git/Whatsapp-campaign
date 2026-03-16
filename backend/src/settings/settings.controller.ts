import { Controller, Get, Post, Put, Delete, Body, UseGuards, Session, Param, ParseIntPipe, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { WhatsAppSettingsDto, UpdateSettingsDto, SettingsResponseDto } from './dto/settings.dto';
import { SessionGuard } from '../auth/session.guard';
import { diskStorage } from 'multer';
import { extname } from 'path';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Get default WhatsApp configuration settings' })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully', type: SettingsResponseDto })
  async getSettings(@Session() session: any): Promise<SettingsResponseDto> {
    return this.settingsService.getSettings(session.tenantId);
  }

  @Get('all')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Get all WhatsApp configuration settings' })
  @ApiResponse({ status: 200, description: 'All settings retrieved successfully', type: [SettingsResponseDto] })
  async getAllSettings(@Session() session: any): Promise<SettingsResponseDto[]> {
    return this.settingsService.getAllSettings(session.tenantId);
  }

  @Get('feature-assignments')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Get feature phone number assignments' })
  @ApiResponse({ status: 200, description: 'Feature assignments retrieved successfully' })
  async getFeatureAssignments(@Session() session: any): Promise<any> {
    return this.settingsService.getFeatureAssignments(session.tenantId);
  }

  @Get(':id')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Get WhatsApp settings by ID' })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully', type: SettingsResponseDto })
  async getSettingsById(@Session() session: any, @Param('id', ParseIntPipe) id: number): Promise<SettingsResponseDto> {
    return this.settingsService.getSettingsById(session.tenantId, id);
  }

  @Post()
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Create new WhatsApp settings' })
  @ApiResponse({ status: 201, description: 'Settings created successfully', type: SettingsResponseDto })
  async createSettings(@Session() session: any, @Body() whatsAppSettingsDto: WhatsAppSettingsDto): Promise<SettingsResponseDto> {
    return this.settingsService.createSettings(session.tenantId, whatsAppSettingsDto);
  }

  @Post('upload-image')
  @UseGuards(SessionGuard)
  @UseInterceptors(FileInterceptor('image', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `header-${uniqueSuffix}${extname(file.originalname)}`);
      }
    }),
    fileFilter: (req, file, cb) => {
      // Allow images, videos, and documents
      const allowedMimes = [
        // Images
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        // Videos
        'video/mp4',
        'video/avi',
        'video/quicktime',
        'video/x-msvideo',
        // Documents
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ];
      
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        return cb(new Error('Only images (JPG, PNG, GIF), videos (MP4, AVI, MOV), and documents (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX) are allowed!'), false);
      }
    },
    limits: { fileSize: 16 * 1024 * 1024 }
  }))
  @ApiOperation({ summary: 'Upload header media' })
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new Error('No file uploaded');
    }
    const imageUrl = `${process.env.UPLOAD_URL}/${file.filename}`;
    return { url: imageUrl };
  }

  @Put(':id')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Update WhatsApp settings' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully', type: SettingsResponseDto })
  async updateSettings(@Session() session: any, @Param('id', ParseIntPipe) id: number, @Body() updateSettingsDto: UpdateSettingsDto): Promise<SettingsResponseDto> {
    return this.settingsService.updateSettings(session.tenantId, id, updateSettingsDto);
  }

  @Delete(':id')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Delete WhatsApp settings' })
  @ApiResponse({ status: 200, description: 'Settings deleted successfully' })
  async deleteSettings(@Session() session: any, @Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.settingsService.deleteSettings(session.tenantId, id);
  }

  @Put(':id/default')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Set settings as default' })
  @ApiResponse({ status: 200, description: 'Default settings updated successfully', type: SettingsResponseDto })
  async setDefaultSettings(@Session() session: any, @Param('id', ParseIntPipe) id: number): Promise<SettingsResponseDto> {
    return this.settingsService.setDefaultSettings(session.tenantId, id);
  }

  @Post('feature-assignments')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Save feature phone number assignments' })
  @ApiResponse({ status: 200, description: 'Feature assignments saved successfully' })
  async saveFeatureAssignments(@Session() session: any, @Body() assignments: any): Promise<any> {
    return this.settingsService.saveFeatureAssignments(session.tenantId, assignments);
  }
}
