import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';

@Injectable()
export class GroupService {
  constructor(private prisma: PrismaService) {}

  // Create new group
  async create(createGroupDto: CreateGroupDto, userId: number) {
    if (!createGroupDto.name || !createGroupDto.name.trim()) {
      throw new Error('Group name is required');
    }

    return this.prisma.group.create({
      data: {
        name: createGroupDto.name.trim(),
        user: {
          connect: { id: userId },
        },
      },
    });
  }

  // Get all groups for a user
  async findAll(userId: number) {
    return this.prisma.group.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Get one group by ID
  async findOne(id: number, userId: number) {
    const group = await this.prisma.group.findFirst({
      where: { id, userId },
    });
    if (!group) throw new NotFoundException('Group not found');
    return group;
  }

  // Update group
  async update(id: number, name: string, userId: number) {
    const group = await this.findOne(id, userId);
    return this.prisma.group.update({
      where: { id: group.id },
      data: { name: name.trim() },
    });
  }

  // Delete group
  async remove(id: number, userId: number) {
    const group = await this.findOne(id, userId);
    return this.prisma.group.delete({ where: { id: group.id } });
  }
}
