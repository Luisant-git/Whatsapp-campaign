import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { LoginAdminDto } from './dto/login-admin.dto';
import { CentralPrismaService } from '../central-prisma.service';
import * as bcrypt from 'bcrypt';
 
@Injectable()
export class AdminService {
    constructor(private prisma: CentralPrismaService) {}
 
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
    return await this.prisma.tenant.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async registerUser(createUserDto: { name: string; email: string; password: string }) {
    const { email, name, password } = createUserDto;

    const existingUser = await this.prisma.tenant.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.tenant.create({
      data: {
        email,
        name,
        password: hashedPassword,
        dbName: `tenant_${Date.now()}`,
        dbHost: 'localhost',
        dbPort: 5432,
        dbUser: 'postgres',
        dbPassword: 'root',
      },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
      },
    });

    return { message: 'User registered successfully', user };
  }
 
  async toggleUserChatbot(userId: number) {
    return { message: 'Feature not available in multi-tenant mode' };
  }

  async toggleUserQuickReply(userId: number) {
    return { message: 'Feature not available in multi-tenant mode' };
  }
 
  async updateUserSession(userId: number, sessionStore: any) {
    // Not needed in multi-tenant mode
  }
}