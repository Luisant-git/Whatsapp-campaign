import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateMasterConfigDto, UpdateMasterConfigDto } from './dto/master-config.dto';

@Injectable()
export class MasterConfigService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateMasterConfigDto, userId: number) {
    // Check if verify token is already used by another user
    if (createDto.verifyToken) {
      const tokenUsedByOtherUser = await this.prisma.masterConfig.findFirst({
        where: {
          verifyToken: createDto.verifyToken,
          userId: { not: userId }
        }
      });
      
      if (tokenUsedByOtherUser) {
        throw new ConflictException('This verify token is already used by another user');
      }
    }

    return this.prisma.masterConfig.create({
      data: {
        ...createDto,
        userId,
        isActive: createDto.isActive ?? true,
      },
    });
  }

  async findAll(userId: number) {
    return this.prisma.masterConfig.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, userId: number) {
    return this.prisma.masterConfig.findFirst({
      where: { id, userId },
    });
  }

  async update(id: number, updateDto: UpdateMasterConfigDto, userId: number) {
    const existingConfig = await this.prisma.masterConfig.findFirst({
      where: { id, userId }
    });

    // Check if verify token is already used by another user
    if (updateDto.verifyToken && updateDto.verifyToken !== existingConfig?.verifyToken) {
      const tokenUsedByOtherUser = await this.prisma.masterConfig.findFirst({
        where: {
          verifyToken: updateDto.verifyToken,
          userId: { not: userId }
        }
      });
      
      if (tokenUsedByOtherUser) {
        throw new ConflictException('This verify token is already used by another user');
      }
    }

    return this.prisma.masterConfig.update({
      where: { id },
      data: updateDto,
    });
  }

  async remove(id: number, userId: number) {
    return this.prisma.masterConfig.delete({
      where: { id },
    });
  }
}