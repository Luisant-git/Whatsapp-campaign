import { Module } from '@nestjs/common';
import { TestController } from './test.controller';
import { TestService } from './test.service';
import { TenantPrismaService } from '../tenant-prisma.service';

@Module({
  controllers: [TestController],
  providers: [TestService, TenantPrismaService],
})
export class TestModule {}
