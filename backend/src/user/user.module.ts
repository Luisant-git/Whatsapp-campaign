import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { CentralPrismaService } from 'src/central-prisma.service';


@Module({

  controllers: [UserController],
  providers: [UserService,CentralPrismaService],
})
export class UserModule {}
