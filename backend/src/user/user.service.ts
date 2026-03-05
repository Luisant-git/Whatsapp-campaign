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
    const { email, password } = loginUserDto;
  
    let tenant = await this.centralPrisma.tenant.findUnique({ where: { email } });
    let subUser: any = null;
  
    if (!tenant) {
      subUser = await this.centralPrisma.subUser.findUnique({ where: { email } });
      if (!subUser) throw new UnauthorizedException('Invalid credentials');
  
      const valid = await bcrypt.compare(password, subUser.password);
      if (!valid) throw new UnauthorizedException('Invalid credentials');
      if (!subUser.isActive) throw new UnauthorizedException('Account is deactivated');
  
      tenant = await this.centralPrisma.tenant.findUnique({
        where: { id: subUser.tenantId },
      });
      if (!tenant) throw new UnauthorizedException('Tenant not found for sub-user');
    } else {
      const valid = await bcrypt.compare(password, tenant.password);
      if (!valid) throw new UnauthorizedException('Invalid credentials');
      if (!tenant.isActive) throw new UnauthorizedException('Account is deactivated');
    }
  
    // Check subscription
    const activeSubscription = await this.centralPrisma.subscriptionOrder.findFirst({
      where: {
        tenantId: tenant.id,
        status: 'active',
        endDate: { gte: new Date() },
      },
      include: { plan: true },
    });
    if (!activeSubscription)
      throw new UnauthorizedException('No active subscription found');
  
    // ✅ CRITICAL: Store tenantId separately from userId
    session.userId = subUser ? subUser.id : tenant.id;
    session.tenantId = tenant.id;           // ← ALWAYS the tenant's ID
    session.userType = subUser ? 'subuser' : 'tenant';  // ← NEW
    session.user = {
      id: subUser ? subUser.id : tenant.id,
      tenantId: tenant.id,                  // ← ADD THIS
      email,
      name: subUser ? (subUser.designation || subUser.email) : tenant.name,
      role: subUser ? subUser.role : 'owner',
      userType: subUser ? 'subuser' : 'tenant',  // ← ADD THIS
    };
    await new Promise<void>((resolve, reject) => {
      session.save((err: any) => {
        if (err) {
          console.error('Session save error:', err);
          reject(err);
        }
        resolve();
      });
    });
    return { message: 'Login successful', user: session.user };
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
    const tenantId = session.tenantId;
    const userId = session.userId;
    const userType = session.userType || 'tenant';
  
    if (!userId || !tenantId) {
      throw new UnauthorizedException('Not authenticated');
    }
  
    // ✅ ALWAYS use tenantId to find tenant (not userId)
    const tenant = await this.centralPrisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new UnauthorizedException('Tenant not found');
    }
  
    // If subuser, fetch their details
    let subUserDetails: any = null;
    if (userType === 'subuser') {
      subUserDetails = await this.centralPrisma.subUser.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          mobileNumber: true,
          designation: true,
          role: true,
          isActive: true,
        },
      });
      if (!subUserDetails) {
        throw new UnauthorizedException('Sub-user not found');
      }
    }
  
    // Fetch tenant config
    let tenantConfig: any = {};
    try {
      const tenantDbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
      const tenantPrisma = new TenantPrisma({
        datasources: { db: { url: tenantDbUrl } },
      });
      await tenantPrisma.$connect();
      tenantConfig = (await tenantPrisma.tenantConfig.findFirst()) || {};
      await tenantPrisma.$disconnect();
    } catch (err) {
      console.error('Error fetching tenant config:', err);
    }
  
    // ✅ Fetch menu permissions
    let menuPermission: any = null;
    try {
      menuPermission = await this.centralPrisma.menuPermission.findUnique({
        where: { tenantId: tenant.id },
      });
    } catch (err) {
      console.error('Error fetching menu permissions:', err);
    }
  
    return {
      message: 'Current user retrieved successfully',
      user: {
        id: userType === 'subuser' ? subUserDetails.id : tenant.id,
        tenantId: tenant.id,
        email: userType === 'subuser' ? subUserDetails.email : tenant.email,
        name: userType === 'subuser' ? subUserDetails.designation : tenant.name,
        isActive: userType === 'subuser' ? subUserDetails.isActive : tenant.isActive,
        companyName: tenant.companyName,
        contactPersonName: tenant.contactPersonName,
        phoneNumber: tenant.phoneNumber,
        companyAddress: tenant.companyAddress,
        city: tenant.city,
        pincode: tenant.pincode,
        state: tenant.state,
        country: tenant.country,
        subscriptionId: tenant.subscriptionId,
        aiChatbotEnabled: tenantConfig.aiChatbotEnabled || false,
        useQuickReply: tenantConfig.useQuickReply !== false,
      },
      role: userType === 'subuser' ? subUserDetails.role : 'owner',
      userType,
      menuPermission,  // ← Frontend uses this to show/hide menus
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
