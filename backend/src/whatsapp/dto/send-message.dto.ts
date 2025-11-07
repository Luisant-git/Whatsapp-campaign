import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsPhoneNumber } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ 
    description: 'Recipient phone number with country code',
    example: '919876543210'
  })
  @IsString()
  @IsNotEmpty()
  to: string;

  @ApiProperty({ 
    description: 'Message text to send',
    example: 'Hello! How are you?'
  })
  @IsString()
  @IsNotEmpty()
  message: string;
}