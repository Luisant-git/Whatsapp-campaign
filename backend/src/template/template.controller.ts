import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Session,
} from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { TemplateService } from './template.service';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplatePreviewDto,
  RequestReviewDto,
  TemplateStatus,
  TemplateCategory,
} from './dto/template.dto';

@Controller('templates')
@UseGuards(SessionGuard)
export class TemplateController {
  constructor(private templateService: TemplateService) {}

  @Post()
  async createTemplate(@Session() session: any, @Body() createTemplateDto: CreateTemplateDto) {
    return this.templateService.createTemplate(session.tenantId, createTemplateDto);
  }

  @Get()
  async getTemplates(
    @Session() session: any,
    @Query('status') status?: TemplateStatus,
    @Query('category') category?: TemplateCategory,
  ) {
    return this.templateService.getTemplates(session.tenantId, status, category);
  }

  @Get('library')
  async getTemplateLibrary() {
    return this.templateService.getTemplateLibrary();
  }

  @Post('preview')
  async previewTemplate(@Body() previewDto: TemplatePreviewDto) {
    return this.templateService.previewTemplate(previewDto);
  }

  @Post('sync')
  async syncTemplateStatus(@Session() session: any) {
    return this.templateService.syncTemplateStatus(session.tenantId);
  }

  @Post('request-review')
  async requestReview(@Session() session: any, @Body() requestReviewDto: RequestReviewDto) {
    return this.templateService.requestReview(session.tenantId, requestReviewDto);
  }

  @Get(':templateId')
  async getTemplate(@Session() session: any, @Param('templateId') templateId: string) {
    return this.templateService.getTemplate(session.tenantId, templateId);
  }

  @Put(':templateId')
  async updateTemplate(
    @Session() session: any,
    @Param('templateId') templateId: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
  ) {
    return this.templateService.updateTemplate(session.tenantId, templateId, updateTemplateDto);
  }

  @Delete(':templateId')
  async deleteTemplate(@Session() session: any, @Param('templateId') templateId: string) {
    return this.templateService.deleteTemplate(session.tenantId, templateId);
  }
}