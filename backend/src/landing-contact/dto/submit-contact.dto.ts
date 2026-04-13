import { IsString, IsNotEmpty, IsIn, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitContactDto {
  @ApiProperty({
    description: 'Business name',
    example: 'Example Business Ltd',
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: 'Business name is required' })
  businessName: string;

  @ApiProperty({
    description: 'Customer name',
    example: 'John Doe',
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: 'Your name is required' })
  yourName: string;

  @ApiProperty({
    description: 'WhatsApp number in E.164 format',
    example: '+919876543210',
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: 'WhatsApp number is required' })
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Valid WhatsApp number is required (E.164 format)',
  })
  whatsappNumber: string;

  @ApiProperty({
    description: 'Does the business have a website',
    example: 'yes',
    enum: ['yes', 'no'],
    required: true,
  })
  @IsString()
  @IsIn(['yes', 'no'], { message: 'Please select if you have a website' })
  hasWebsite: string;

  @ApiProperty({
    description: 'Primary business goal',
    example: 'all',
    enum: ['marketing', 'ecommerce', 'appointment', 'all'],
    required: true,
  })
  @IsString()
  @IsIn(['marketing', 'ecommerce', 'appointment', 'all'], {
    message: 'Please select a valid primary goal',
  })
  primaryGoal: string;
}
