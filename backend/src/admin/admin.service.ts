import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { LoginAdminDto } from './dto/login-admin.dto';
import { PrismaService } from 'src/prisma.service';
import * as bcrypt from 'bcrypt';
 
@Injectable()
export class AdminService {
    constructor(private prisma: PrismaService) {}
 
  async register(createAdminDto: CreateAdminDto) {
    const { email, name, password } = createAdminDto;
   
    const existingAdmin = await this.prisma.admin.findUnique({ where: { email } });
    if (existingAdmin) {
      throw new ConflictException('Admin with this email already exists');
    }
   
    const hashedPassword = await bcrypt.hash(password, 10);
   
    const admin = await this.prisma.admin.create({
      data: {
        email,
        name,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });
   
    return { message: 'Admin registered successfully', admin };
  }
 
  async login(loginAdminDto: LoginAdminDto) {
    const { email, password } = loginAdminDto;
   
    const admin = await this.prisma.admin.findUnique({ where: { email } });
    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }
   
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
   
    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
    };
  }
 
  async findAll() {
    return await this.prisma.admin.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
 
  findOne(id: number) {
    return `This action returns a #${id} admin`;
  }
 
  update(id: number, updateAdminDto: UpdateAdminDto) {
    return `This action updates a #${id} admin`;
  }
 
  remove(id: number) {
    return `This action removes a #${id} admin`;
  }
 
  async getAllUsers() {
    return await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        aiChatbotEnabled: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async registerUser(createUserDto: { name: string; email: string; password: string }) {
    const { email, name, password } = createUserDto;

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        aiChatbotEnabled: true,
        createdAt: true,
      },
    });

    return { message: 'User registered successfully', user };
  }
 
  async toggleUserChatbot(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { aiChatbotEnabled: true },
    });
 
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
 
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { aiChatbotEnabled: !user.aiChatbotEnabled },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        aiChatbotEnabled: true,
      },
    });
 
    return { message: 'AI Chatbot toggled successfully', user: updatedUser };
  }
 
  async updateUserSession(userId: number, sessionStore: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { aiChatbotEnabled: true },
    });
    if (user && sessionStore) {
      sessionStore.all((err: any, sessions: any) => {
        if (err) return;
        Object.keys(sessions).forEach(sessionId => {
          const session = sessions[sessionId];
          if (session.user && session.user.id === userId) {
            session.user.aiChatbotEnabled = user.aiChatbotEnabled;
            sessionStore.set(sessionId, session);
          }
        });
      });
    }
  }
}