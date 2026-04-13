import { Module } from '@nestjs/common';
import { LandingContactController } from './landing-contact.controller';
import { LandingContactService } from './landing-contact.service';
import { CentralPrismaService } from '../central-prisma.service';

@Module({
  controllers: [LandingContactController],
  providers: [LandingContactService, CentralPrismaService],
})
export class LandingContactModule {}
