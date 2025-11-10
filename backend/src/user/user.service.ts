import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  private prisma = new PrismaClient();

  async register(createUserDto: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email }
    });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword
      },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true
      }
    });

    return { message: 'User registered successfully', user };
  }

  async login(loginUserDto: LoginUserDto, session: any) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginUserDto.email }
    });

    if (!user || !await bcrypt.compare(loginUserDto.password, user.password)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Store user data in session
    session.user = {
      id: user.id,
      email: user.email,
      name: user.name
    };

    // Log user session
    console.log(`User logged in: ${user.email} (ID: ${user.id})`);

    return {
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
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
    if (!session.user) {
      throw new UnauthorizedException('Not authenticated');
    }
    return { user: session.user };
  }

  findAll() {
    return this.prisma.user.findMany({
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
    return this.prisma.user.findUnique({
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
    return this.prisma.user.update({
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
    return this.prisma.user.delete({ where: { id } });
  }
}
