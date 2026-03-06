import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Session,
  UnauthorizedException,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SubUserMenuPermissionService } from './subuser-menu-permission.service';
import { UpdateSubuserMenuPermissionDto } from './dto/update-subuser-menu-permission.dto';


@ApiTags('SubUser Menu Permission')
@Controller('subuser-menu-permission')
export class SubUserMenuPermissionController {
  constructor(private readonly service: SubUserMenuPermissionService) {}

  // ── helper: get tenantId from session ──
  private getTenantId(session: any): number {
    const tenantId = session?.userId;
    if (!tenantId) {
      throw new UnauthorizedException('No tenant in session');
    }
    return tenantId;
  }

  // ===== GET all subusers permissions =====
  @Get()
  @ApiOperation({ summary: 'Get all subusers menu permissions' })
  async findAll(@Session() session: any) {
    const tenantId = this.getTenantId(session);
    return this.service.findAllByTenant(tenantId);
  }

  // ===== GET single subuser permission =====
  @Get(':subUserId')
  @ApiOperation({ summary: 'Get subuser menu permission' })
  async findOne(
    @Param('subUserId', ParseIntPipe) subUserId: number,
    @Session() session: any,
  ) {
    const tenantId = this.getTenantId(session);
    return this.service.findBySubUser(tenantId, subUserId);
  }

  // ===== GET effective permission =====
  @Get(':subUserId/effective')
  @ApiOperation({ summary: 'Get effective permission (tenant ∩ subuser)' })
  async getEffective(
    @Param('subUserId', ParseIntPipe) subUserId: number,
    @Session() session: any,
  ) {
    const tenantId = this.getTenantId(session);
    return this.service.getEffectivePermission(tenantId, subUserId);
  }

  // ===== CREATE or UPDATE =====
  @Post(':subUserId')
  @ApiOperation({ summary: 'Create or update subuser menu permission' })
  async save(
    @Param('subUserId', ParseIntPipe) subUserId: number,
    @Session() session: any,
    @Body() dto: UpdateSubuserMenuPermissionDto,
  ) {
    const tenantId = this.getTenantId(session);
    return this.service.createOrUpdate(tenantId, subUserId, dto.permission);
  }

  // ===== DELETE =====
  @Delete(':subUserId')
  @ApiOperation({ summary: 'Delete subuser menu permission' })
  async remove(
    @Param('subUserId', ParseIntPipe) subUserId: number,
    @Session() session: any,
  ) {
    const tenantId = this.getTenantId(session);
    return this.service.delete(tenantId, subUserId);
  }

  // ===== SubUser: Get own permission (for subuser login) =====
  @Get('me/current')
  @ApiOperation({ summary: 'SubUser: Get my menu permission' })
  async getMyCurrent(@Session() session: any) {
    // session.subUserId and session.tenantId set during subuser login
    const subUserId = session?.subUserId;
    const tenantId = session?.tenantId;

    if (!subUserId || !tenantId) {
      throw new UnauthorizedException('SubUser not authenticated');
    }

    return this.service.getEffectivePermission(tenantId, subUserId);
  }
}