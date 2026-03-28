import { ApiProperty } from '@nestjs/swagger';

export class AnalyticsDto {
  @ApiProperty({ description: 'Total messages sent' })
  totalMessages: number;

  @ApiProperty({ description: 'Messages sent today' })
  todayMessages: number;

  @ApiProperty({ description: 'Successful deliveries' })
  successfulDeliveries: number;

  @ApiProperty({ description: 'Failed messages' })
  failedMessages: number;

  @ApiProperty({ description: 'Delivery rate percentage' })
  deliveryRate: number;

  @ApiProperty({ description: 'Total unique contacts' })
  totalContacts: number;

  @ApiProperty({ description: 'Messages by status' })
  messagesByStatus: {
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  };

  @ApiProperty({ description: 'Total groups count' })
  totalGroups: number;

  @ApiProperty({ description: 'Total message templates count' })
  totalMessageTemplates: number;

  @ApiProperty({ description: 'Total completed/sent broadcast campaigns count' })
  totalBroadcasts: number;

  @ApiProperty({ description: 'Daily message statistics for the last 7 days' })
  dailyStats: Array<{
    date: string;
    sent: number;
    delivered: number;
    failed: number;
  }>;
}