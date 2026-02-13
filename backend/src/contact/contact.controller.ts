import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ContactService } from './contact.service';
import { SessionGuard } from '../auth/session.guard';
import { TenantContext } from '../tenant/tenant.decorator';
import type { TenantContext as TenantContextType } from '../tenant/tenant.decorator';

export class CreateContactDto {
  name: string;
  phone: string;
  email?: string;
  place?: string;
  dob?: Date;
  anniversary?: Date;
  groupId: number;
}

export class UpdateContactDto {
  name?: string;
  phone?: string;
  group?: string;
  email?: string;
  place?: string;
  dob?: Date;
  anniversary?: Date;
  groupId?: number;
}

@Controller('contact')
@UseGuards(SessionGuard)
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  create(
    @Body() createContactDto: CreateContactDto,
    @TenantContext() tenantContext: TenantContextType,
  ) {
    return this.contactService.create(createContactDto, tenantContext);
  }

  @Get()
  findAll(
    @TenantContext() tenantContext: TenantContextType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.contactService.findAll(
      tenantContext,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      search || '',
    );
  }

  @Get('group/:groupId/contacts')
  getContactsByGroup(
    @Param('groupId') groupId: string,
    @TenantContext() tenantContext: TenantContextType,
  ) {
    return this.contactService.getContactsByGroup(+groupId, tenantContext);
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
    @TenantContext() tenantContext: TenantContextType,
  ) {
    return this.contactService.updateDeliveryStatus(
      body.phone,
      body.status,
      body.campaignName,
      body.name || body.phone,
      tenantContext,
    );
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateContactDto: UpdateContactDto,
    @TenantContext() tenantContext: TenantContextType,
  ) {
    return this.contactService.update(+id, updateContactDto, tenantContext);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @TenantContext() tenantContext: TenantContextType,
  ) {
    return this.contactService.remove(+id, tenantContext);
  }

  @Get('labels/all')
  getLabels(@TenantContext() tenantContext: TenantContextType) {
    return this.contactService.getLabels(tenantContext);
  }

  @Get('blocklist')
  async getBlocklisted(@TenantContext() tenantContext: TenantContextType) {
    return this.contactService.getBlocklistedContacts(tenantContext);
  }

  @Post('labels/:phone')
  async updateLabels(
    @Param('phone') phone: string,
    @Body('labels') labels: string[],
    @TenantContext() tenantContext: TenantContextType,
  ) {
    return this.contactService.updateLabels(phone, labels, tenantContext);
  }

  @Post('remove-label')
  removeLabel(
    @Body('phone') phone: string,
    @Body('label') label: string,
    @TenantContext() tenantContext: TenantContextType,
  ) {
    return this.contactService.removeLabel(phone, label, tenantContext);
  }
}
