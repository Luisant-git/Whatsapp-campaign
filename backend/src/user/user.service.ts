import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { CentralPrismaService } from '../central-prisma.service';
import { PrismaClient as TenantPrisma } from '@prisma/client-tenant';
import { execSync } from 'child_process';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private centralPrisma: CentralPrismaService) {}

  async register(createUserDto: CreateUserDto) {
    const existingUser = await this.centralPrisma.tenant.findUnique({
      where: { email: createUserDto.email }
    });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const dbName = `tenant_${createUserDto.email.replace(/[^a-zA-Z0-9]/g, '_')}`;

    // Create tenant record
    const tenant = await this.centralPrisma.tenant.create({
      data: {
        email: createUserDto.email,
        name: createUserDto.name,
        password: hashedPassword,
        isActive: true,
        dbName,
        dbHost: 'localhost',
        dbPort: 5432,
        dbUser: 'postgres',
        dbPassword: 'root',
      },
    });

    // Create tenant database
    await this.centralPrisma.$executeRawUnsafe(`CREATE DATABASE ${dbName}`);
    
    // Push schema to tenant database
    const tenantDbUrl = `postgresql://postgres:root@localhost:5432/${dbName}?schema=public`;
    process.env.TENANT_DATABASE_URL = tenantDbUrl;
    execSync('npx prisma db push --schema=./prisma/schema-tenant.prisma --skip-generate', {
      stdio: 'pipe',
    });

    return {
      message: 'User registered successfully',
      user: {
        id: tenant.id,
        email: tenant.email,
        name: tenant.name,
        isActive: tenant.isActive,
        createdAt: tenant.createdAt,
      },
    };
  }

  async login(loginUserDto: LoginUserDto, session: any) {
    const tenant = await this.centralPrisma.tenant.findUnique({
      where: { email: loginUserDto.email }
    });

    if (!tenant || !await bcrypt.compare(loginUserDto.password, tenant.password)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!tenant.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    session.userId = tenant.id;
    session.user = {
      id: tenant.id,
      email: tenant.email,
      name: tenant.name,
    };

    return {
      message: 'Login successful',
      user: {
        id: tenant.id,
        email: tenant.email,
        name: tenant.name,
      }
    };
  }

  async logout(session: any) {
    return new Promise((resolve, reject) => {
      session.destroy((err: any) => {
        if (err) {
          reject(new Error('Could not log out'));
        } else {
          resolve({ message: 'Logout successful' });
        }
      });
    });
  }

  async getCurrentUser(session: any) {
    if (!session.userId) {
      throw new UnauthorizedException('Not authenticated');
    }
    const tenant = await this.centralPrisma.tenant.findUnique({
      where: { id: session.userId },
    });
    if (!tenant) {
      throw new UnauthorizedException('Tenant not found');
    }

    // Fetch tenant config from tenant database
    let tenantConfig: any = null;
    try {
      const tenantDbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
      const tenantPrisma = new TenantPrisma({
        datasources: { db: { url: tenantDbUrl } },
      });
      await tenantPrisma.$connect();
      tenantConfig = await tenantPrisma.tenantConfig.findFirst();
      await tenantPrisma.$disconnect();
    } catch (error) {
      console.error('Error fetching tenant config:', error);
    }

    return {
      message: 'Current user retrieved successfully',
      user: {
        id: tenant.id,
        email: tenant.email,
        name: tenant.name,
        isActive: tenant.isActive,
        aiChatbotEnabled: tenantConfig?.aiChatbotEnabled || false,
        useQuickReply: tenantConfig?.useQuickReply !== false,
      }
    };
  }

  findAll() {
    return this.centralPrisma.tenant.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true
      }
    });
  }

  findOne(id: number) {
    return this.centralPrisma.tenant.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true
      }
    });
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return this.centralPrisma.tenant.update({
      where: { id },
      data: updateUserDto,
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        updatedAt: true
      }
    });
  }

  remove(id: number) {
    return this.centralPrisma.tenant.delete({ where: { id } });
  }

  async updateName(userId: number, name: string, session: any) {
    const tenant = await this.centralPrisma.tenant.update({
      where: { id: userId },
      data: { name },
      select: {
        id: true,
        email: true,
        name: true,
      }
    });
    
    if (session.user) {
      session.user.name = name;
    }
    
    return { message: 'Name updated successfully', user: tenant };
  }

  async updatePreference(userId: number, useQuickReply: boolean) {
    return { message: 'Preference updated successfully' };
  }
}
