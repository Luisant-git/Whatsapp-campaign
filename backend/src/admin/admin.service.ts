import { Injectable, ConflictException, UnauthorizedException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { LoginAdminDto } from './dto/login-admin.dto';
import { CentralPrismaService } from '../central-prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { UpdateUserDto } from 'src/user/dto/update-user.dto';
import { CreateSubUserDto } from './dto/create-subuser.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: CentralPrismaService) { }

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
        companyName: true,
        contactPersonName: true,
        phoneNumber: true,
        companyAddress: true,
        city: true,
        pincode: true,
        state: true,
        country: true,
        dbName: true,
        dbHost: true,
        dbPort: true,
        dbUser: true,
        dbPassword: true,
        subscriptionId: true,
        subscriptionStartDate: true,
        subscriptionEndDate: true,
        subscription: {
          select: {
            id: true,
            name: true,
            duration: true,
            userLimit: true,
            price: true,
          },
        },
        isActive: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const { PrismaClient } = require('@prisma/client-tenant');

    const usersWithConfig = await Promise.all(
      tenants.map(async (tenant) => {
        try {
          const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
          const tenantPrisma = new PrismaClient({
            datasources: { db: { url: dbUrl } },
          });

          await tenantPrisma.$connect();
          const config = await tenantPrisma.tenantConfig.findFirst();
          await tenantPrisma.$disconnect();

          return {
            // keep all tenant fields
            id: tenant.id,
            email: tenant.email,
            name: tenant.name,
            companyName: tenant.companyName,
            contactPersonName: tenant.contactPersonName,
            phoneNumber: tenant.phoneNumber,
            companyAddress: tenant.companyAddress,
            city: tenant.city,
            pincode: tenant.pincode,
            state: tenant.state,
            country: tenant.country,
            subscriptionId: tenant.subscriptionId,
            subscriptionStartDate: tenant.subscriptionStartDate,
            subscriptionEndDate: tenant.subscriptionEndDate,
            subscription: tenant.subscription,
            isActive: tenant.isActive,
            createdAt: tenant.createdAt,

            // add config-based fields
            aiChatbotEnabled: config?.aiChatbotEnabled || false,
            useQuickReply: config?.useQuickReply !== false,
          };
        } catch (error) {
          console.error(`Error fetching config for tenant ${tenant.id}:`, error);
          return {
            id: tenant.id,
            email: tenant.email,
            name: tenant.name,
            companyName: tenant.companyName,
            contactPersonName: tenant.contactPersonName,
            phoneNumber: tenant.phoneNumber,
            companyAddress: tenant.companyAddress,
            city: tenant.city,
            pincode: tenant.pincode,
            state: tenant.state,
            country: tenant.country,
            subscriptionId: tenant.subscriptionId,
            subscriptionStartDate: tenant.subscriptionStartDate,
            subscriptionEndDate: tenant.subscriptionEndDate,
            subscription: tenant.subscription,
            isActive: tenant.isActive,
            createdAt: tenant.createdAt,
            aiChatbotEnabled: false,
            useQuickReply: true,
          };
        }
      }),
    );

    return usersWithConfig;
  }
  async registerUser(createUserDto: CreateUserDto) {
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

        companyName: createUserDto.companyName || null,
        contactPersonName: createUserDto.contactPersonName || null,
        phoneNumber: createUserDto.phoneNumber || null,
        companyAddress: createUserDto.companyAddress || null,
        city: createUserDto.city || null,
        pincode: createUserDto.pincode || null,
        state: createUserDto.state || null,
        country: createUserDto.country || null,



        subscriptionId: createUserDto.subscriptionId ?? null,

      },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
        companyName: true,
        contactPersonName: true,
        phoneNumber: true,
        companyAddress: true,
        city: true,
        pincode: true,
        state: true,
        country: true,
        subscriptionId: true,

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



  async updateUser(id: number, updateUserDto: UpdateUserDto) {
    // This will update only the fields provided in updateUserDto
    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: updateUserDto,
      select: {
        id: true,
        email: true,
        name: true,
        companyName: true,
        contactPersonName: true,
        phoneNumber: true,
        companyAddress: true,
        city: true,
        pincode: true,
        state: true,
        country: true,
        subscriptionId: true,
        subscriptionStartDate: true,
        subscriptionEndDate: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      message: 'Tenant updated successfully',
      user: tenant,
    };
  }
  async updateUserSession(userId: number, sessionStore: any) {
    // Not needed in multi-tenant mode
  }

  async createUserSubscription(userId: number, data: { planId: number; startDate?: string; endDate?: string }) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: data.planId } });
    if (!plan) throw new Error('Plan not found');

    const startDate = data.startDate ? new Date(data.startDate) : new Date();
    const endDate = data.endDate ? new Date(data.endDate) : new Date(startDate.getTime() + plan.duration * 24 * 60 * 60 * 1000);

    // Unset all current plans
    await this.prisma.subscriptionOrder.updateMany({
      where: { tenantId: userId },
      data: { isCurrentPlan: false }
    });

    // Create new subscription order
    const order = await this.prisma.subscriptionOrder.create({
      data: {
        tenantId: userId,
        planId: data.planId,
        amount: plan.price,
        startDate,
        endDate,
        status: 'active',
        isCurrentPlan: true
      },
      include: { plan: true }
    });

    // Update tenant subscription
    await this.prisma.tenant.update({
      where: { id: userId },
      data: {
        subscriptionId: data.planId,
        subscriptionStartDate: startDate,
        subscriptionEndDate: endDate
      }
    });

    return { message: 'Subscription created successfully', order };
  }



  async registerSubUser(createSubUserDto: CreateSubUserDto) {
    const { email, password, mobileNumber, designation, role, tenantId } = createSubUserDto;
  
    // 1) Check tenant existence
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
  
    // 2) ✅ Get active subscription + plan to read userLimit
    const activeSubscription = await this.prisma.subscriptionOrder.findFirst({
      where: {
        tenantId,
        status: 'active',
        endDate: { gte: new Date() },
        // if you have isCurrentPlan in your schema, add:
        // isCurrentPlan: true,
      },
      include: { plan: true },
    });
  
    if (!activeSubscription?.plan) {
      throw new UnauthorizedException('No active subscription found');
    }
  
    const userLimit = activeSubscription.plan.userLimit; // Int? (nullable)
  
    // 3) ✅ Enforce limit (SUB-USERS ONLY)
    // Count only ACTIVE subusers (recommended)
    if (typeof userLimit === 'number') {
      const activeSubUsersCount = await this.prisma.subUser.count({
        where: { tenantId, isActive: true },
      });
  
      if (activeSubUsersCount >= userLimit) {
        throw new ForbiddenException(
          `Sub-user limit reached. Your plan allows only ${userLimit} sub-user(s).`
        );
      }
    }
  
    // 4) Check uniqueness
    const existingSubUser = await this.prisma.subUser.findFirst({
      where: { OR: [{ email }, { mobileNumber }] },
    });
    if (existingSubUser) {
      throw new ConflictException('Sub-user with this email or mobile number already exists');
    }
  
    // 5) Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
  
    // 6) Create sub-user
    const subUser = await this.prisma.subUser.create({
      data: {
        email,
        password: hashedPassword,
        mobileNumber,
        designation: designation || null,
        role: role || 'staff',
        tenantId,
      },
      select: {
        id: true,
        email: true,
        mobileNumber: true,
        designation: true,
        role: true,
        isActive: true,
        tenantId: true,
        createdAt: true,
      },
    });
  
    return { message: 'Sub-user registered successfully', subUser };
  }
  async getTenantSubUsers(tenantId: number) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const subUsers = await this.prisma.subUser.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        mobileNumber: true,
        designation: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return { tenantId, tenantEmail: tenant.email, subUsers };
  }


  async updateSubUser(
    id: number,
    data: Partial<CreateSubUserDto>,
    tenantId?: number,
  ) {
    const subUser = await this.prisma.subUser.findUnique({ where: { id } });
    if (!subUser) throw new NotFoundException('Sub-user not found');
  
    // if tenant is calling, enforce ownership
    if (tenantId && subUser.tenantId !== tenantId) {
      throw new ForbiddenException('Cannot update sub-user of another tenant');
    }
  
    // uniqueness checks if changing email/mobile
    if (data.email || data.mobileNumber) {
      const existing = await this.prisma.subUser.findFirst({
        where: {
          id: { not: id },
          OR: [
            data.email ? { email: data.email } : undefined,
            data.mobileNumber ? { mobileNumber: data.mobileNumber } : undefined,
          ].filter(Boolean) as any,
        },
      });
      if (existing) {
        throw new ConflictException('Sub-user with this email or mobile number already exists');
      }
    }
  
    // hash password if provided
    const updateData: any = {
      ...(data.email && { email: data.email }),
      ...(data.mobileNumber && { mobileNumber: data.mobileNumber }),
      ...(data.designation !== undefined && { designation: data.designation || null }),
      ...(data.role && { role: data.role }),
   
    };
  
    if (data.password && data.password.trim()) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }
  
    const updated = await this.prisma.subUser.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        mobileNumber: true,
        designation: true,
        role: true,
        isActive: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  
    return { message: 'Sub-user updated successfully', subUser: updated };
  }
  // src/subuser/subuser.service.ts
async getSubUserById(id: number) {
  const subUser = await this.prisma.subUser.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      mobileNumber: true,
      designation: true,
      role: true,
      isActive: true,
      tenantId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!subUser) throw new NotFoundException('Sub-user not found');
  return subUser;
}




  async updateMenuPermissions(tenantId: number, permission: Record<string, any>) {
    return this.prisma.menuPermission.upsert({
      where: { tenantId },
      update: { permission },
      create: {
        tenantId,
        permission,
      },
    });
  }

  async deactivateSubUser(id: number, tenantId?: number) {
  const subUser = await this.prisma.subUser.findUnique({ where: { id } });
  if (!subUser) throw new NotFoundException('Sub-user not found');

  // If tenantId provided => enforce ownership
  if (tenantId && subUser.tenantId !== tenantId) {
    throw new ForbiddenException('Cannot deactivate sub-user of another tenant');
  }

  return this.prisma.subUser.update({
    where: { id },
    data: { isActive: false },
    select: {
      id: true,
      email: true,
      mobileNumber: true,
      designation: true,
      role: true,
      isActive: true,
      tenantId: true,
      updatedAt: true,
    },
  });
}
}