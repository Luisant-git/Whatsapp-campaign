import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SessionGuard } from '../auth/session.guard';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('upload')
@UseGuards(SessionGuard)
export class UploadController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `header-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new Error('No file uploaded');
    }

    return {
      success: true,
      filename: file.filename,
      originalName: file.originalname,
      fileUrl: `/uploads/${file.filename}`,
      size: file.size,
    };
  }
}