import { Controller, Get, Post, Body, Patch, Param, Delete, Session, Req, UseGuards, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SessionGuard } from '../auth/session.guard';

@ApiTags('Users')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  register(@Body() createUserDto: CreateUserDto) {
    return this.userService.register(createUserDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() loginUserDto: LoginUserDto, @Session() session: Record<string, any>) {
    return this.userService.login(loginUserDto, session);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  logout(@Session() session: Record<string, any>) {
    return this.userService.logout(session);
  }

  @Get('me')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  getCurrentUser(@Session() session: Record<string, any>) {
    return this.userService.getCurrentUser(session);
  }

  @Put('update-name')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Update user name' })
  @ApiResponse({ status: 200, description: 'Name updated successfully' })
  updateName(@Body() body: { name: string }, @Session() session: Record<string, any>) {
    return this.userService.updateName(session.user.id, body.name, session);
  }

  @Put('preference')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Update user preference' })
  @ApiResponse({ status: 200, description: 'Preference updated successfully' })
  updatePreference(@Body() body: { useQuickReply: boolean }, @Session() session: Record<string, any>) {
    return this.userService.updatePreference(session.user.id, body.useQuickReply);
  }

  @Get()
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'List of all users' })
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(+id, updateUserDto);
  }

  @Get('profile/:id')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  getProfile(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }

  @Delete(':id')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }
}
