import { ApiProperty } from '@nestjs/swagger';

export class MessageResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'WhatsApp message ID', required: false })
  messageId?: string;

  @ApiProperty({ description: 'Error message if failed', required: false })
  error?: string;
}

export class BulkMessageResultDto {
  @ApiProperty({ description: 'Phone number' })
  phoneNumber: string;

  @ApiProperty({ description: 'Send success status' })
  success: boolean;

  @ApiProperty({ description: 'WhatsApp message ID if successful', required: false })
  messageId?: string;

  @ApiProperty({ description: 'Error message if failed', required: false })
  error?: string;
}

export class WhatsAppMessageDto {
  @ApiProperty({ description: 'Message ID' })
  id: number;

  @ApiProperty({ description: 'WhatsApp message ID' })
  messageId: string;

  @ApiProperty({ description: 'Sender/Recipient phone number' })
  from: string;

  @ApiProperty({ description: 'Message text', required: false })
  message?: string;

  @ApiProperty({ description: 'Media type', required: false })
  mediaType?: string;

  @ApiProperty({ description: 'Media URL', required: false })
  mediaUrl?: string;

  @ApiProperty({ description: 'Message direction (incoming/outgoing)' })
  direction: string;

  @ApiProperty({ description: 'Message status' })
  status: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Update timestamp' })
  updatedAt: Date;
}