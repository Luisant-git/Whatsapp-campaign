import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsInt,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto  {
  @ApiProperty({
    example: 'info@acme.test',
    description: 'Company email address (also used for login)',
  })
  @IsEmail()
  email: string;

  
  @ApiProperty({ example: 'John Doe', description: 'User full name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: 'Acme Solutions Pvt Ltd',
    description: 'Company name',
  })
  @IsString()
  companyName?: string;

  @ApiProperty({
    example: 'John doe',
    description: 'Contact person full name',
  })
  @IsString()
  contactPersonName?: string;

  @ApiProperty({
    example: '9876543210',
    description: 'Contact mobile number',
  })
  @IsString()
  phoneNumber?: string; // maps to Tenant.phoneNumber

  @ApiProperty({
    example: '123, MG Road, Near Metro Station',
    description: 'Company address',
  })
  @IsString()
  companyAddress?: string;

  @ApiProperty({ example: 'Bengaluru' })
  @IsString()
  city?: string;

  @ApiProperty({ example: '560001' })
  @IsString()
  pincode?: string;

  @ApiProperty({ example: 'Karnataka' })
  @IsString()
  state?: string;

  @ApiProperty({ example: 'India' })
  @IsString()
  country?: string;

  @ApiProperty({
    example: 'password123',
    description: 'Account password (minimum 6 characters)',
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    example: 1,
    description: 'Subscription plan ID (links to SubscriptionPlan.id)',
    required: false,
  })
  @IsOptional()
  @IsInt()
  subscriptionId?: number;
}