import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MenuPermissionService } from './menu-permission.service';
import { CreateMenuPermissionDto } from './dto/create-menu-permission.dto';


@ApiTags('Menu Permission (Super Admin)')
@ApiBearerAuth()
@Controller('menu-permission')
export class MenuPermissionController {
  constructor(
    private readonly service: MenuPermissionService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create or update menu permission for tenant' })
  @ApiResponse({ status: 201, description: 'Permission saved successfully' })
  async createOrUpdate(
    @Body() dto: CreateMenuPermissionDto,
  ) {
    return this.service.createOrUpdate(
      dto.tenantId,
      dto.permission,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all tenant menu permissions' })
  async findAll() {
    return this.service.findAll();
  }

  @Get(':tenantId')
  @ApiOperation({ summary: 'Get menu permission by tenant ID' })
  @ApiParam({ name: 'tenantId', type: Number })
  async findOne(
    @Param('tenantId', ParseIntPipe) tenantId: number,
  ) {
    return this.service.findByTenant(tenantId);
  }

  @Patch(':tenantId')
  @ApiOperation({ summary: 'Update menu permission for tenant' })
  @ApiParam({ name: 'tenantId', type: Number })
  async update(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Body() dto: CreateMenuPermissionDto,
  ) {
    return this.service.update(
      tenantId,
      dto.permission,
    );
  }
}