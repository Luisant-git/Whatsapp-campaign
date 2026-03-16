import { Module } from '@nestjs/common';
import { MetaFlowController } from './meta-flow.controller';
import { MetaFlowService } from './meta-flow.service';
import { FlowAppointmentModule } from '../flow-appointment/flow-appointment.module';
import { FlowsModule } from '../whatsapp/flows/flows.module';
import { CentralPrismaService } from '../central-prisma.service';

@Module({
  imports: [FlowAppointmentModule, FlowsModule],
  controllers: [MetaFlowController],
  providers: [MetaFlowService, CentralPrismaService],
})
export class MetaFlowModule {}
