import { Injectable } from '@nestjs/common';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class AdminService {
    constructor(private prisma: PrismaService) {}
  
  async create(createAdminDto: CreateAdminDto) {
    const { email, name, password } = createAdminDto;
    const data = await this.prisma.admin.create({
      data: {
        email,
        name,
        password,
      },
    });
  }

  async findAll() {
    const data = await this.prisma.admin.findMany({
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
}
