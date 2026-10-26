import { Module } from '@nestjs/common';
import { LandingContactController } from './landing-contact.controller';
import { LandingContactService } from './landing-contact.service';

@Module({
  controllers: [LandingContactController],
  providers: [LandingContactService],
})
export class LandingContactModule {}
