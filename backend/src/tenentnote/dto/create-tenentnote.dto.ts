import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CreateTenentnoteDto {
  @IsInt()
  tenantId: number;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;
}