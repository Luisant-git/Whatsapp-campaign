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
    return this.settingsService.getSettings(session.user.id);
  }

  @Get('all')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Get all WhatsApp configuration settings' })
  @ApiResponse({ status: 200, description: 'All settings retrieved successfully', type: [SettingsResponseDto] })
  async getAllSettings(@Session() session: any): Promise<SettingsResponseDto[]> {
    return this.settingsService.getAllSettings(session.user.id);
  }

  @Get(':id')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Get WhatsApp settings by ID' })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully', type: SettingsResponseDto })
  async getSettingsById(@Session() session: any, @Param('id', ParseIntPipe) id: number): Promise<SettingsResponseDto> {
    return this.settingsService.getSettingsById(session.user.id, id);
  }

  @Post()
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Create new WhatsApp settings' })
  @ApiResponse({ status: 201, description: 'Settings created successfully', type: SettingsResponseDto })
  async createSettings(@Session() session: any, @Body() whatsAppSettingsDto: WhatsAppSettingsDto): Promise<SettingsResponseDto> {
    return this.settingsService.createSettings(session.user.id, whatsAppSettingsDto);
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
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|mp4|avi|mov|quicktime)$/)) {
        return cb(new Error('Only image and video files are allowed!'), false);
      }
      cb(null, true);
    },
    limits: { fileSize: 16 * 1024 * 1024 }
  }))
  @ApiOperation({ summary: 'Upload header media' })
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    const imageUrl = `${process.env.UPLOAD_URL}/${file.filename}`;
    return { url: imageUrl };
  }

  @Put(':id')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Update WhatsApp settings' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully', type: SettingsResponseDto })
  async updateSettings(@Session() session: any, @Param('id', ParseIntPipe) id: number, @Body() updateSettingsDto: UpdateSettingsDto): Promise<SettingsResponseDto> {
    return this.settingsService.updateSettings(session.user.id, id, updateSettingsDto);
  }

  @Delete(':id')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Delete WhatsApp settings' })
  @ApiResponse({ status: 200, description: 'Settings deleted successfully' })
  async deleteSettings(@Session() session: any, @Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.settingsService.deleteSettings(session.user.id, id);
  }

  @Put(':id/default')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Set settings as default' })
  @ApiResponse({ status: 200, description: 'Default settings updated successfully', type: SettingsResponseDto })
  async setDefaultSettings(@Session() session: any, @Param('id', ParseIntPipe) id: number): Promise<SettingsResponseDto> {
    return this.settingsService.setDefaultSettings(session.user.id, id);
  }
}
