import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Session,
  UnauthorizedException,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { MenuPermissionService } from './menu-permission.service';
import { UpdateMenuPermissionDto } from './dto/update-menu-permission.dto';

@ApiTags('Menu Permission')
@Controller('menu-permission')
export class MenuPermissionController {
  constructor(private readonly service: MenuPermissionService) {}


   // ===== Tenant: Get current tenant menu permission =====
   @Get('current')
   @ApiOperation({ summary: 'Get current tenant menu permission' })
   async getCurrent(@Session() session: any) {
     const tenantId = session.userId; // same as in UserService.login
     if (!tenantId) {
       throw new UnauthorizedException('No tenant in session');
     }
 
     try {
       const record = await this.service.findByTenant(tenantId);
       // Return only the permission JSON the frontend needs
       return { permission: record.permission || {} };
     } catch {
       // No record yet → treat as empty permission (show all by default or none, up to you)
       return { permission: {} };
     }
   }

  // ===== Admin: Get menu permission by tenantId =====
  @Get(':tenantId')
  async getByTenant(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Session() session: any,
  ) {
    if (!session?.adminId) {
      throw new UnauthorizedException('Admin authentication required');
    }
  
    return this.service.findByTenant(tenantId);
  }

  // ===== Admin: Create or Update by tenantId =====
  @Post(':tenantId')
  @ApiOperation({ summary: 'Admin: Create or update menu permission' })
  async save(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Session() session: any,
    @Body() dto: UpdateMenuPermissionDto,
  ) {
    if (!session?.adminId) {
      throw new UnauthorizedException('Admin authentication required');
    }

    return this.service.createOrUpdate(tenantId, dto.permission);
  }

  // ===== Admin: Update (PATCH) by tenantId (optional) =====
  @Patch(':tenantId')
  @ApiOperation({ summary: 'Admin: Update menu permission' })
  async update(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Session() session: any,
    @Body() dto: UpdateMenuPermissionDto,
  ) {
    if (!session?.adminId) {
      throw new UnauthorizedException('Admin authentication required');
    }

    return this.service.update(tenantId, dto.permission);
  }

  // ===== Admin: Get all permissions =====
  @Get()
  @ApiOperation({ summary: 'Admin: Get all menu permissions' })
  async findAll(@Session() session: any) {
    if (!session?.adminId) {
      throw new UnauthorizedException('Admin authentication required');
    }

    return this.service.findAll();
  }

  
}