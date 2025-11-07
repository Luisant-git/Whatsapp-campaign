import { ApiProperty } from '@nestjs/swagger';

export class UploadResponseDto {
  @ApiProperty({ description: 'Upload success status' })
  success: boolean;

  @ApiProperty({ description: 'Generated filename' })
  filename: string;

  @ApiProperty({ description: 'Original filename' })
  originalName: string;

  @ApiProperty({ description: 'Full media URL' })
  mediaUrl: string;

  @ApiProperty({ description: 'Media type (image/video/audio/document)' })
  mediaType: string;

  @ApiProperty({ description: 'File size in bytes' })
  size: number;

  @ApiProperty({ description: 'File MIME type' })
  mimetype: string;
}