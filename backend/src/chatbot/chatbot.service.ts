import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { ChatMessageDto } from './dto/chat-message.dto';
import Groq from 'groq-sdk';

@Injectable()
export class ChatbotService {
  private groq: Groq;

  constructor(private prisma: PrismaService) {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }

  async uploadDocument(userId: number, uploadDocumentDto: UploadDocumentDto) {
    if (!uploadDocumentDto.content || uploadDocumentDto.content.trim() === '') {
      throw new Error('Document content is required and cannot be empty');
    }

    if (!uploadDocumentDto.filename) {
      throw new Error('Document filename is required');
    }
    
    try {
      return await this.prisma.document.create({
        data: {
          filename: uploadDocumentDto.filename,
          content: uploadDocumentDto.content.trim(),
          userId,
        },
      });
    } catch (error) {
      throw new Error(`Failed to save document: ${error.message}`);
    }
  }

  async processMessage(userId: number, chatMessageDto: ChatMessageDto) {
    let session = await this.prisma.chatSession.findFirst({
      where: { phone: chatMessageDto.phone, userId },
    });

    if (!session) {
      session = await this.prisma.chatSession.create({
        data: { phone: chatMessageDto.phone, userId },
      });
    }

    await this.prisma.chatMessage.create({
      data: {
        message: chatMessageDto.message,
        isFromUser: true,
        sessionId: session.id,
      },
    });

    const documents = await this.prisma.document.findMany({
      where: { userId },
      select: { content: true, filename: true },
    });

    // If no documents uploaded, return fallback message
    if (documents.length === 0) {
      const fallbackResponse = 'I don\'t have any documents to reference. Please contact our support team for assistance.';
      
      await this.prisma.chatMessage.create({
        data: {
          message: fallbackResponse,
          isFromUser: false,
          sessionId: session.id,
        },
      });
      
      return { response: fallbackResponse };
    }

    const context = documents.map(doc => `Document: ${doc.filename}\n${doc.content}`).join('\n\n');

    const completion = await this.groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a helpful customer support assistant. Answer questions based ONLY on the following documents:\n\n${context}\n\nIf the question cannot be answered from the documents, respond with: "I don't have information about that in my knowledge base. Please contact our support team at [support contact] for further assistance."`,
        },
        {
          role: 'user',
          content: chatMessageDto.message,
        },
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.3,
      max_tokens: 1024,
    });

    const aiResponse = completion.choices[0]?.message?.content || 'I\'m having technical difficulties. Please contact our support team for assistance.';

    await this.prisma.chatMessage.create({
      data: {
        message: aiResponse,
        isFromUser: false,
        sessionId: session.id,
      },
    });

    return { response: aiResponse };
  }

  async getChatHistory(userId: number, phone: string) {
    const session = await this.prisma.chatSession.findFirst({
      where: { phone, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return session?.messages || [];
  }

  async getUserDocuments(userId: number) {
    return this.prisma.document.findMany({
      where: { userId },
      select: { id: true, filename: true, createdAt: true },
    });
  }

  async deleteDocument(userId: number, documentId: number) {
    return this.prisma.document.delete({
      where: { id: documentId, userId },
    });
  }
}