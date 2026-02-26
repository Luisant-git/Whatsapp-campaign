import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsInt,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    example: 'info@acme.test',
    description: 'Company email address (also used for login)',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Owner / user full name',
    
  })
  @IsOptional()
  @IsString()
  name: string;

  @ApiProperty({
    example: 'password123',
    description: 'Account password (minimum 6 characters)',
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    example: 'Acme Solutions Pvt Ltd',
    description: 'Company name',
   
  })
  @IsOptional()
  @IsString()
  companyName: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Contact person full name',
    
  })
  @IsOptional()
  @IsString()
  contactPersonName: string;

  @ApiProperty({
    example: '9876543210',
    description: 'Contact mobile number',
  
  })
  @IsOptional()
  @IsString()
  phoneNumber: string;

  @ApiProperty({
    example: '123 MG Road, Near Metro Station',
    description: 'Company address',
   
  })
  @IsOptional()
  @IsString()
  companyAddress: string;

  @ApiProperty({ example: 'Bengaluru', required: false })
  @IsOptional()
  @IsString()
  city: string;

  @ApiProperty({ example: '560001', required: false })
  @IsOptional()
  @IsString()
  pincode: string;

  @ApiProperty({ example: 'Karnataka', required: false })
  @IsOptional()
  @IsString()
  state: string;

  @ApiProperty({ example: 'India', required: false })
  @IsOptional()
  @IsString()
  country: string;

  @IsInt()
  subscriptionId?: number;
}