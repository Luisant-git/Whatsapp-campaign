import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSubUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  mobileNumber: string;

  @IsOptional()
  @IsString()
  designation?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsNotEmpty()
  tenantId: number; // Required: which tenant this sub-user belongs to
}