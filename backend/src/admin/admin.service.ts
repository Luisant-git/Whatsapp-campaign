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
    const tenants = await this.prisma.tenant.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
        dbName: true,
        dbHost: true,
        dbPort: true,
        dbUser: true,
        dbPassword: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Fetch tenant config for each tenant
    const { PrismaClient } = require('@prisma/client-tenant');
    const usersWithConfig = await Promise.all(
      tenants.map(async (tenant) => {
        try {
          const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
          const tenantPrisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
          
          await tenantPrisma.$connect();
          const config = await tenantPrisma.tenantConfig.findFirst();
          await tenantPrisma.$disconnect();
          
          return {
            id: tenant.id,
            email: tenant.email,
            name: tenant.name,
            isActive: tenant.isActive,
            createdAt: tenant.createdAt,
            aiChatbotEnabled: config?.aiChatbotEnabled || false,
            useQuickReply: config?.useQuickReply !== false,
          };
        } catch (error) {
          console.error(`Error fetching config for tenant ${tenant.id}:`, error);
          return {
            id: tenant.id,
            email: tenant.email,
            name: tenant.name,
            isActive: tenant.isActive,
            createdAt: tenant.createdAt,
            aiChatbotEnabled: false,
            useQuickReply: true,
          };
        }
      })
    );

    return usersWithConfig;
  }

  async registerUser(createUserDto: { name: string; email: string; password: string }) {
    const { email, name, password } = createUserDto;

    const existingUser = await this.prisma.tenant.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const dbName = `tenant_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;

    // Create tenant record
    const user = await this.prisma.tenant.create({
      data: {
        email,
        name,
        password: hashedPassword,
        isActive: true,
        dbName,
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

    // Create tenant database
    try {
      await this.prisma.$executeRawUnsafe(`CREATE DATABASE ${dbName}`);
      
      // Push schema to tenant database
      const tenantDbUrl = `postgresql://postgres:root@localhost:5432/${dbName}?schema=public`;
      const { execSync } = require('child_process');
      process.env.TENANT_DATABASE_URL = tenantDbUrl;
      execSync('npx prisma db push --schema=./prisma/schema-tenant.prisma --skip-generate', {
        stdio: 'pipe',
      });
    } catch (error) {
      // If database creation fails, delete the tenant record
      await this.prisma.tenant.delete({ where: { id: user.id } });
      throw new Error(`Failed to create tenant database: ${error.message}`);
    }

    return { message: 'User registered successfully', user };
  }
 
  async toggleUserChatbot(userId: number) {
    // Get tenant info
    const tenant = await this.prisma.tenant.findUnique({ where: { id: userId } });
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Connect to tenant database
    const { PrismaClient } = require('@prisma/client-tenant');
    const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
    const tenantPrisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

    try {
      await tenantPrisma.$connect();
      
      // Get or create tenant config
      const config = await tenantPrisma.tenantConfig.findFirst();
      
      if (config) {
        await tenantPrisma.tenantConfig.update({
          where: { id: config.id },
          data: { aiChatbotEnabled: !config.aiChatbotEnabled },
        });
      } else {
        await tenantPrisma.tenantConfig.create({
          data: { aiChatbotEnabled: true },
        });
      }
      
      return { message: 'AI Chatbot toggled successfully' };
    } finally {
      await tenantPrisma.$disconnect();
    }
  }

  async toggleUserQuickReply(userId: number) {
    // Get tenant info
    const tenant = await this.prisma.tenant.findUnique({ where: { id: userId } });
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Connect to tenant database
    const { PrismaClient } = require('@prisma/client-tenant');
    const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
    const tenantPrisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

    try {
      await tenantPrisma.$connect();
      
      // Get or create tenant config
      const config = await tenantPrisma.tenantConfig.findFirst();
      
      if (config) {
        await tenantPrisma.tenantConfig.update({
          where: { id: config.id },
          data: { useQuickReply: !config.useQuickReply },
        });
      } else {
        await tenantPrisma.tenantConfig.create({
          data: { useQuickReply: true },
        });
      }
      
      return { message: 'Quick Reply toggled successfully' };
    } finally {
      await tenantPrisma.$disconnect();
    }
  }
 
  async updateUserSession(userId: number, sessionStore: any) {
    // Not needed in multi-tenant mode
  }
}