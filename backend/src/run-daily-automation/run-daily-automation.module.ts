import { Module } from '@nestjs/common';
import { RunDailyAutomationService } from './run-daily-automation.service';
import { RunDailyAutomationController } from './run-daily-automation.controller';

@Module({
  controllers: [RunDailyAutomationController],
  providers: [RunDailyAutomationService],
})
export class RunDailyAutomationModule {}
