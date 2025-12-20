import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  UseInterceptors,
  UploadedFile,
  Session,
  Query,
  Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ChatbotService } from './chatbot.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { ChatMessageDto } from './dto/chat-message.dto';
const pdfParse = require('pdf-parse');
import * as mammoth from 'mammoth';

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('upload-document')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Session() session: any,
  ) {
    try {
      const userId = session.user?.id;
      if (!userId) {
        return { success: false, message: 'User not authenticated' };
      }

      if (!file) {
        return { success: false, message: 'No file uploaded' };
      }

      let content = '';
      
      if (file.mimetype === 'application/pdf') {
        try {
          const pdfData = await pdfParse(file.buffer);
          content = pdfData?.text || '';
        } catch (pdfError) {
          console.log('PDF parsing error:', pdfError);
          return { success: false, message: 'Failed to extract text from PDF. The PDF might be password-protected or corrupted.' };
        }
      } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        try {
          const result = await mammoth.extractRawText({ buffer: file.buffer });
          content = result.value || '';
        } catch (docxError) {
          return { success: false, message: 'Failed to extract text from DOCX file.' };
        }
      } else if (file.mimetype === 'text/plain') {
        content = file.buffer.toString('utf-8');
      } else {
        return { success: false, message: 'Unsupported file type. Please upload PDF, DOCX, or TXT files.' };
      }

      content = content.trim();
      if (!content) {
        return { success: false, message: `Could not extract text from ${file.originalname}. The document might be image-based or empty.` };
      }

      const uploadDocumentDto: UploadDocumentDto = {
        filename: file.originalname,
        content,
      };

      const result = await this.chatbotService.uploadDocument(userId, uploadDocumentDto);
      return { success: true, message: 'Document uploaded successfully', data: result };
    } catch (error) {
      console.error('Upload error:', error);
      return { success: false, message: error.message || 'Failed to upload document' };
    }
  }

  @Post('message')
  async processMessage(
    @Body() chatMessageDto: ChatMessageDto,
    @Session() session: any,
  ) {
    const userId = session.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    return this.chatbotService.processMessage(userId, chatMessageDto);
  }

  @Get('history')
  async getChatHistory(
    @Query('phone') phone: string,
    @Session() session: any,
  ) {
    const userId = session.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    return this.chatbotService.getChatHistory(userId, phone);
  }

  @Get('documents')
  async getUserDocuments(@Session() session: any) {
    const userId = session.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    return this.chatbotService.getUserDocuments(userId);
  }

  @Delete('documents/:id')
  async deleteDocument(
    @Param('id') id: string,
    @Session() session: any,
  ) {
    const userId = session.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    return this.chatbotService.deleteDocument(userId, parseInt(id));
  }
}