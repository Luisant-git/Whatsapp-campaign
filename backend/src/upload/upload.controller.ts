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
        fileSize: 16 * 1024 * 1024, // 16MB limit
      },
      fileFilter: (req, file, cb) => {
        // Allow images, videos, and documents
        const allowedMimes = [
          // Images
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          // Videos
          'video/mp4',
          'video/avi',
          'video/quicktime',
          'video/x-msvideo',
          // Documents
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ];
        
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type. Only images (JPG, PNG, GIF), videos (MP4, AVI, MOV), and documents (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX) are allowed.'), false);
        }
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