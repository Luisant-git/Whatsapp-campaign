import { Controller, Get, Post, Body, Patch, Param, Delete, Session, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { LoginAdminDto } from './dto/login-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.adminService.remove(id);
  }
}
