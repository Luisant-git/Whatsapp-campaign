import { Module } from '@nestjs/common';
import { SubuserService } from './subuser.service';
import { SubuserController } from './subuser.controller';
import { TenantPrismaService } from 'src/tenant-prisma.service';

@Module({
  controllers: [SubuserController],
  providers: [SubuserService,TenantPrismaService],
})
export class SubuserModule {}
