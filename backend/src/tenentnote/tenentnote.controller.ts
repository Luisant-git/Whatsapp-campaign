import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { TenentnoteService } from './tenentnote.service';
import { CreateTenentnoteDto } from './dto/create-tenentnote.dto';
import { UpdateTenentnoteDto } from './dto/update-tenentnote.dto';
import { AdminSessionGuard } from '../auth/admin-session.guard';

@Controller('tenentnote')
@UseGuards(AdminSessionGuard)
export class TenentnoteController {
  constructor(private readonly tenentnoteService: TenentnoteService) {}

  @Post()
  create(@Body() createTenentnoteDto: CreateTenentnoteDto) {
    return this.tenentnoteService.create(createTenentnoteDto);
  }

  @Get()
  findAll() {
    return this.tenentnoteService.findAll();
  }

  @Get('tenant/:tenantId')
  findByTenant(@Param('tenantId', ParseIntPipe) tenantId: number) {
    return this.tenentnoteService.findByTenant(tenantId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tenentnoteService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTenentnoteDto: UpdateTenentnoteDto,
  ) {
    return this.tenentnoteService.update(id, updateTenentnoteDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tenentnoteService.remove(id);
  }
}