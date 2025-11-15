import { IsString, IsNotEmpty } from 'class-validator';

export class UploadDocumentDto {
  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}