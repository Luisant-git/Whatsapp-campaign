import { Controller, Get, Post, Put, Body, UseGuards, Session } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { WhatsAppSettingsDto, UpdateSettingsDto, SettingsResponseDto } from './dto/settings.dto';
import { SessionGuard } from '../auth/session.guard';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Get WhatsApp configuration settings' })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully', type: SettingsResponseDto })
  async getSettings(@Session() session: any): Promise<SettingsResponseDto> {
    return this.settingsService.getSettings(session.user.id);
  }

  @Post()
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Create new WhatsApp settings' })
  @ApiResponse({ status: 201, description: 'Settings created successfully', type: SettingsResponseDto })
  async createSettings(@Session() session: any, @Body() whatsAppSettingsDto: WhatsAppSettingsDto): Promise<SettingsResponseDto> {
    return this.settingsService.createSettings(session.user.id, whatsAppSettingsDto);
  }

  @Put()
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Update WhatsApp settings' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully', type: SettingsResponseDto })
  async updateSettings(@Session() session: any, @Body() updateSettingsDto: UpdateSettingsDto): Promise<SettingsResponseDto> {
    return this.settingsService.updateSettings(session.user.id, updateSettingsDto);
  }
}