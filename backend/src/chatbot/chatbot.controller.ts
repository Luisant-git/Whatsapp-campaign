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
import * as pdfParse from 'pdf-parse';
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
    const userId = session.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    let content = '';
    
    if (file.mimetype === 'application/pdf') {
      const pdfData = await (pdfParse as any)(file.buffer);
      content = pdfData.text;
    } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      content = result.value;
    } else if (file.mimetype === 'text/plain') {
      content = file.buffer.toString('utf-8');
    } else {
      throw new Error('Unsupported file type');
    }

    const uploadDocumentDto: UploadDocumentDto = {
      filename: file.originalname,
      content,
    };

    return this.chatbotService.uploadDocument(userId, uploadDocumentDto);
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