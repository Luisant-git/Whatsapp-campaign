import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import { CentralPrismaService } from '../central-prisma.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { ChatMessageDto } from './dto/chat-message.dto';
import Groq from 'groq-sdk';

@Injectable()
export class ChatbotService {
  private groq: Groq;

  constructor(
    private tenantPrisma: TenantPrismaService,
    private centralPrisma: CentralPrismaService,
  ) {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }

  private async getPrisma(userId: number) {
    const tenant = await this.centralPrisma.tenant.findUnique({
      where: { id: userId },
    });
    if (!tenant) throw new Error('Tenant not found');
    
    const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
    return this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);
  }

  async uploadDocument(userId: number, uploadDocumentDto: UploadDocumentDto) {
    const prisma = await this.getPrisma(userId);
    if (!uploadDocumentDto.content || uploadDocumentDto.content.trim() === '') {
      throw new Error('Document content is required and cannot be empty');
    }

    if (!uploadDocumentDto.filename) {
      throw new Error('Document filename is required');
    }
    
    try {
      return await prisma.document.create({
        data: {
          filename: uploadDocumentDto.filename,
          content: uploadDocumentDto.content.trim(),
        },
      });
    } catch (error) {
      throw new Error(`Failed to save document: ${error.message}`);
    }
  }

  async processMessage(userId: number, chatMessageDto: ChatMessageDto) {
    const prisma = await this.getPrisma(userId);
    let session = await prisma.chatSession.findFirst({
      where: { phone: chatMessageDto.phone },
    });

    if (!session) {
      session = await prisma.chatSession.create({
        data: { phone: chatMessageDto.phone },
      });
    }

    await prisma.chatMessage.create({
      data: {
        message: chatMessageDto.message,
        isFromUser: true,
        sessionId: session.id,
      },
    });

    const documents = await prisma.document.findMany({
      select: { content: true, filename: true },
    });

    if (documents.length === 0) {
      const fallbackResponse = 'I don\'t have any documents to reference. Please contact our support team for assistance.';
      
      await prisma.chatMessage.create({
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

    await prisma.chatMessage.create({
      data: {
        message: aiResponse,
        isFromUser: false,
        sessionId: session.id,
      },
    });

    return { response: aiResponse };
  }

  async getChatHistory(userId: number, phone: string) {
    const prisma = await this.getPrisma(userId);
    const session = await prisma.chatSession.findFirst({
      where: { phone },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return session?.messages || [];
  }

  async getUserDocuments(userId: number) {
    const prisma = await this.getPrisma(userId);
    return prisma.document.findMany({
      select: { id: true, filename: true, createdAt: true },
    });
  }

  async deleteDocument(userId: number, documentId: number) {
    const prisma = await this.getPrisma(userId);
    return prisma.document.delete({
      where: { id: documentId },
    });
  }
}
