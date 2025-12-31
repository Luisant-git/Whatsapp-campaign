import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Session } from '@nestjs/common';
import { ContactService } from './contact.service';
import { SessionGuard } from './auth/session.guard';

export class CreateContactDto {
  name: string;
  phone: string;
  email?: string;
  company?: string;
  tags?: string[];
  notes?: string;
}

export class UpdateContactDto {
  name?: string;
  phone?: string;
  email?: string;
  company?: string;
  tags?: string[];
  notes?: string;
}

@Controller('contact')
@UseGuards(SessionGuard)
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  create(@Body() createContactDto: CreateContactDto, @Session() session: Record<string, any>) {
    return this.contactService.create(createContactDto, session.userId);
  }

  @Get()
  findAll(@Session() session: Record<string, any>) {
    return this.contactService.findAll(session.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Session() session: Record<string, any>) {
    return this.contactService.findOne(+id, session.userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateContactDto: UpdateContactDto, @Session() session: Record<string, any>) {
    return this.contactService.update(+id, updateContactDto, session.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Session() session: Record<string, any>) {
    return this.contactService.remove(+id, session.userId);
  }
}
