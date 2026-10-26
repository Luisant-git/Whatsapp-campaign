import { Module } from '@nestjs/common';
import { CustomerDetailsFlowController } from './customer-details-flow.controller';
import { CustomerDetailsFlowService } from '../whatsapp/flows/customer-details-flow.service';
import { CustomerDetailsFlowHandler } from '../whatsapp/flows/customer-details.flow';

@Module({
  controllers: [CustomerDetailsFlowController],
  providers: [
    CustomerDetailsFlowService,
    CustomerDetailsFlowHandler,
  ],
  exports: [CustomerDetailsFlowService, CustomerDetailsFlowHandler],
})
export class CustomerDetailsFlowModule {}