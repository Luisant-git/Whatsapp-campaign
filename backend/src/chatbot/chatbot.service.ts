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
    return this.prisma.document.create({
      data: {
        filename: uploadDocumentDto.filename,
        content: uploadDocumentDto.content,
        userId,
      },
    });
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

    const context = documents.map(doc => `Document: ${doc.filename}\n${doc.content}`).join('\n\n');

    const completion = await this.groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant. Answer questions based on the following documents:\n\n${context}\n\nIf the question cannot be answered from the documents, politely say you don't have that information.`,
        },
        {
          role: 'user',
          content: chatMessageDto.message,
        },
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.7,
      max_tokens: 1024,
    });

    const aiResponse = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

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
}