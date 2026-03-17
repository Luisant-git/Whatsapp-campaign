import { Module } from '@nestjs/common';
import { CustomerDetailsFlowController } from './customer-details-flow.controller';
import { CustomerDetailsFlowService } from '../whatsapp/flows/customer-details-flow.service';
import { CustomerDetailsFlowHandler } from '../whatsapp/flows/customer-details.flow';
import { TenantPrismaService } from '../tenant-prisma.service';
import { CentralPrismaService } from '../central-prisma.service';

@Module({
  controllers: [CustomerDetailsFlowController],
  providers: [
    CustomerDetailsFlowService,
    CustomerDetailsFlowHandler,
    TenantPrismaService,
    CentralPrismaService,
  ],
  exports: [CustomerDetailsFlowService, CustomerDetailsFlowHandler],
})
export class CustomerDetailsFlowModule {}