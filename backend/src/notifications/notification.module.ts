import { Module } from '@nestjs/common';
import { OwnerNotificationService } from './owner-notification.service';

@Module({
  providers: [OwnerNotificationService],
  exports: [OwnerNotificationService],
})
export class NotificationModule {}
