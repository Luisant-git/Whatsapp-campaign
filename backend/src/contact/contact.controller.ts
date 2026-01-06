import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Session,
  Query,
} from '@nestjs/common';
import { ContactService } from './contact.service';
import { SessionGuard } from '../auth/session.guard';

export class CreateContactDto {
  name: string;
  phone: string;
  group?: string;
  email?: string;
  company?: string;
  tags?: string[];
  notes?: string;
}

export class UpdateContactDto {
  name?: string;
  phone?: string;
  group?: string;
  email?: string;
  company?: string;
  tags?: string[];
  notes?: string;
}

@Controller('contact')
@UseGuards(SessionGuard)
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  private getUserId(session: Record<string, any>): number {
    const userId = session.userId || session.user?.id;
    if (!userId) {
      throw new Error('User session not found');
    }
    return userId;
  }

  @Post()
  create(
    @Body() createContactDto: CreateContactDto,
    @Session() session: Record<string, any>,
  ) {
    return this.contactService.create(createContactDto, this.getUserId(session));
  }

  @Get()
  findAll(
    @Session() session: Record<string, any>,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.contactService.findAll(
      this.getUserId(session),
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      search || '',
    );
  }

  @Get('delivery-stats')
  getDeliveryStats(@Session() session: Record<string, any>) {
    return this.contactService.getDeliveryStats(this.getUserId(session));
  }

  @Get('groups/all')
  getGroups(@Session() session: Record<string, any>) {
    return this.contactService.getGroups(this.getUserId(session));
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Session() session: Record<string, any>) {
    return this.contactService.findOne(+id, this.getUserId(session));
  }

  @Patch('delivery-status')
  updateDeliveryStatus(
    @Body()
    body: {
      phone: string;
      status: string;
      campaignName: string;
      name?: string;
    },
    @Session() session: Record<string, any>,
  ) {
    return this.contactService.updateDeliveryStatus(
      body.phone,
      body.status,
      body.campaignName,
      body.name || body.phone,
      this.getUserId(session),
    );
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateContactDto: UpdateContactDto,
    @Session() session: Record<string, any>,
  ) {
    return this.contactService.update(+id, updateContactDto, this.getUserId(session));
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Session() session: Record<string, any>) {
    return this.contactService.remove(+id, this.getUserId(session));
  }

  @Get('labels/all')
  getLabels(@Session() session: Record<string, any>) {
    return this.contactService.getLabels(this.getUserId(session));
  }

  @Get('labels/custom')
  getCustomLabels(@Session() session: Record<string, any>) {
    return this.contactService.getCustomLabels(this.getUserId(session));
  }

  @Post('labels/custom')
  addCustomLabel(
    @Body('label') label: string,
    @Session() session: Record<string, any>,
  ) {
    return this.contactService.addCustomLabel(this.getUserId(session), label);
  }

  @Delete('labels/custom/:label')
  deleteCustomLabel(
    @Param('label') label: string,
    @Session() session: Record<string, any>,
  ) {
    return this.contactService.deleteCustomLabel(this.getUserId(session), label);
  }

  @Post('labels/:phone')
  updateLabels(
    @Param('phone') phone: string,
    @Body('labels') labels: string[],
    @Session() session: Record<string, any>,
  ) {
    return this.contactService.updateLabels(this.getUserId(session), phone, labels);
  }
}
