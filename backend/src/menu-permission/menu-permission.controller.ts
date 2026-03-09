import {
  Controller,
  Get,
  Post,
  Put,
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
     const tenantId = session.userId;
     if (!tenantId) {
       throw new UnauthorizedException('No tenant in session');
     }
 
     try {
       // Get tenant's current subscription plan
       const tenant = await this.service.getTenantWithSubscription(tenantId);
       
       if (tenant?.subscription?.menuPermissions) {
         // Convert array to object format { key: true }
         const permissions = {};
         tenant.subscription.menuPermissions.forEach(key => {
           permissions[key] = true;
         });
         return { permission: permissions };
       }
       
       // Fallback to tenant-specific menu permission if no subscription
       const record = await this.service.findByTenant(tenantId);
       return { permission: record.permission || {} };
     } catch {
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

  // ===== Admin: Update (PUT) by tenantId =====
  @Put(':tenantId')
  @ApiOperation({ summary: 'Admin: Update menu permission via PUT' })
  async updatePut(
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