import { Injectable, NotFoundException } from '@nestjs/common';
import { CentralPrismaService } from '../central-prisma.service';
import { CreateTenentnoteDto } from './dto/create-tenentnote.dto';
import { UpdateTenentnoteDto } from './dto/update-tenentnote.dto';

@Injectable()
export class TenentnoteService {
  constructor(private readonly centralPrisma: CentralPrismaService) {}

  async create(createTenentnoteDto: CreateTenentnoteDto) {
    const tenant = await this.centralPrisma.tenant.findUnique({
      where: { id: createTenentnoteDto.tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return this.centralPrisma.tenantNote.create({
      data: {
        tenantId: createTenentnoteDto.tenantId,
        title: createTenentnoteDto.title,
        description: createTenentnoteDto.description,
      },
    });
  }

  async findAll() {
    return this.centralPrisma.tenantNote.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        tenant: {
          select: {
            id: true,
            companyName: true,
            phoneNumber: true,
            contactPersonName: true,
          },
        },
      },
    });
  }

  async findOne(id: number) {
    const note = await this.centralPrisma.tenantNote.findUnique({
      where: { id },
      include: {
        tenant: {
          select: {
            id: true,
            companyName: true,
            phoneNumber: true,
            contactPersonName: true,
          },
        },
      },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    return note;
  }

  async findByTenant(tenantId: number) {
    return this.centralPrisma.tenantNote.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: number, updateTenentnoteDto: UpdateTenentnoteDto) {
    const existing = await this.centralPrisma.tenantNote.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Note not found');
    }

    return this.centralPrisma.tenantNote.update({
      where: { id },
      data: {
        ...(updateTenentnoteDto.title !== undefined
          ? { title: updateTenentnoteDto.title }
          : {}),
        ...(updateTenentnoteDto.description !== undefined
          ? { description: updateTenentnoteDto.description }
          : {}),
      },
    });
  }

  async remove(id: number) {
    const existing = await this.centralPrisma.tenantNote.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Note not found');
    }

    await this.centralPrisma.tenantNote.delete({
      where: { id },
    });

    return { message: 'Note deleted successfully' };
  }
}