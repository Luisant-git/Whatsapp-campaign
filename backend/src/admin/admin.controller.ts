import { Controller, Get, Post, Body, Patch, Param, Delete, Session, HttpCode, HttpStatus, UnauthorizedException, ParseIntPipe, ForbiddenException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { LoginAdminDto } from './dto/login-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { UpdateUserDto } from 'src/user/dto/update-user.dto';
import { CreateSubUserDto } from './dto/create-subuser.dto';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  @Post('register')
  @ApiOperation({ summary: 'Register a new admin' })
  async register(@Body() createAdminDto: CreateAdminDto) {
    return this.adminService.register(createAdminDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin login' })
  async login(@Body() loginAdminDto: LoginAdminDto, @Session() session: Record<string, any>) {
    const admin = await this.adminService.login(loginAdminDto);
    session.adminId = admin.id;
    session.adminEmail = admin.email;
    session.adminName = admin.name;

    return {
      message: 'Login successful',
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
      }
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin logout' })
  logout(@Session() session: Record<string, any>) {
    session.destroy();
    return { message: 'Logout successful' };
  }

  @ApiOperation({ summary: 'Register a new sub-user for a tenant' })
@Post('subusers/register')
async registerSubUser(
  @Body() createSubUserDto: CreateSubUserDto,
  @Session() session: Record<string, any>,
) {
  const isAdmin = !!session?.adminId;
  const isTenant = !!session?.tenantId;

  if (!isAdmin && !isTenant) {
    throw new UnauthorizedException('Authentication required');
  }

  // Tenant logged in: force tenantId from session (do not trust request body)
  if (isTenant) {
    if (
      createSubUserDto.tenantId &&
      Number(createSubUserDto.tenantId) !== Number(session.tenantId)
    ) {
      throw new ForbiddenException('Cannot create sub-user for another tenant');
    }

    return this.adminService.registerSubUser({
      ...createSubUserDto,
      tenantId: Number(session.tenantId),
    });
  }

  // Admin logged in
  return this.adminService.registerSubUser(createSubUserDto);
}

  @Get('me')
  @ApiOperation({ summary: 'Get current admin session' })
  getMe(@Session() session: Record<string, any>) {
    if (!session || !session.adminId) {
      throw new UnauthorizedException('Not authenticated');
    }
    return {
      id: session.adminId,
      email: session.adminEmail,
      name: session.adminName,
    };
  }

  @ApiOperation({ summary: 'Get all sub-users of a tenant' })
@Get('tenants/:tenantId/subusers')
async getTenantSubUsers(
  @Param('tenantId', ParseIntPipe) tenantId: number,
  @Session() session: Record<string, any>,
) {
  const isAdmin = !!session?.adminId;
  const isTenant = !!session?.tenantId;

  if (!isAdmin && !isTenant) {
    throw new UnauthorizedException('Authentication required');
  }

  // Tenant can only access their own tenantId
  if (isTenant && Number(session.tenantId) !== tenantId) {
    throw new ForbiddenException('Cannot access another tenant');
  }

  const effectiveTenantId = isAdmin ? tenantId : Number(session.tenantId);
  return this.adminService.getTenantSubUsers(effectiveTenantId);
}
  @Get('test-session')
  @ApiOperation({ summary: 'Test session (debug)' })
  testSession(@Session() session: Record<string, any>) {
    return {
      hasSession: !!session,
      sessionId: session?.id,
      sessionData: session,
    };
  }

  @Get()
  findAll() {
    return this.adminService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.adminService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: number, @Body() updateAdminDto: UpdateAdminDto) {
    return this.adminService.update(id, updateAdminDto);
  }


  @ApiOperation({ summary: 'Deactivate a sub-user (soft delete)' })
  @Patch('subusers/:id/deactivate')
  async deactivateSubUser(
    @Param('id', ParseIntPipe) id: number,
    @Session() session: Record<string, any>,
  ) {
    const isAdmin = !!session?.adminId;
    const isTenant = !!session?.tenantId;
  
    if (!isAdmin && !isTenant) {
      throw new UnauthorizedException('Authentication required');
    }
  
    // If tenant: only allow deactivating subusers under the same tenant
    const tenantId = isTenant ? Number(session.tenantId) : undefined;
  
    return this.adminService.deactivateSubUser(id, tenantId);
  }

  @ApiOperation({ summary: 'Update a sub-user' })
@Patch('subusers/:id')
async updateSubUser(
  @Param('id', ParseIntPipe) id: number,
  @Body() dto: Partial<CreateSubUserDto>,
  @Session() session: Record<string, any>,
) {
  const isAdmin = !!session?.adminId;
  const isTenant = !!session?.tenantId;

  if (!isAdmin && !isTenant) {
    throw new UnauthorizedException('Authentication required');
  }

  const tenantId = isTenant ? Number(session.tenantId) : undefined;

  // tenantId is used only for ownership check inside service
  return this.adminService.updateSubUser(id, dto, tenantId);
}
  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.adminService.remove(id);
  }

  @Get('users/all')
  @ApiOperation({ summary: 'Get all users' })
  getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Post('users/register')
  @ApiOperation({ summary: 'Register a new user' })
  async registerUser(@Body() createUserDto: CreateUserDto) {
    return this.adminService.registerUser(createUserDto);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Admin: Update tenant (status, etc.)' })
  async adminUpdateUser(
    @Param('id') id: number,
    @Body() updateUserDto: UpdateUserDto,
    @Session() session: Record<string, any>,
  ) {
    if (!session?.adminId) {
      throw new UnauthorizedException('Admin authentication required');
    }
    return this.adminService.updateUser(+id, updateUserDto);
  }

  @Patch('users/:id/toggle-quickreply')
  @ApiOperation({ summary: 'Toggle Quick Reply for user' })
  async toggleUserQuickReply(@Param('id') id: number, @Session() session: Record<string, any>) {
    const result = await this.adminService.toggleUserQuickReply(+id);
    await this.adminService.updateUserSession(+id, session.store);
    return result;
  }

  @Post('users/:id/subscription')
  @ApiOperation({ summary: 'Create subscription for user' })
  async createUserSubscription(
    @Param('id') id: number,
    @Body() data: { planId: number; startDate?: string; endDate?: string },
    @Session() session: Record<string, any>
  ) {
    if (!session?.adminId) {
      throw new UnauthorizedException('Admin authentication required');
    }
    return this.adminService.createUserSubscription(+id, data);
  }


}