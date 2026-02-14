import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import { CentralPrismaService } from '../central-prisma.service';

@Injectable()
export class QuickReplyService {
  constructor(
    private tenantPrisma: TenantPrismaService,
    private centralPrisma: CentralPrismaService,
  ) {}

  private async getTenantContext(userId: number) {
    const tenant = await this.centralPrisma.tenant.findUnique({
      where: { id: userId },
    });
    if (!tenant) throw new Error('Tenant not found');
    
    const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
    return { tenantId: tenant.id.toString(), dbUrl };
  }

  private async getPrisma(userId: number) {
    const ctx = await this.getTenantContext(userId);
    return this.tenantPrisma.getTenantClient(ctx.tenantId, ctx.dbUrl);
  }

  async getQuickReply(message: string, userId: number) {
    const prisma = await this.getPrisma(userId);
    const lowerMessage = message.toLowerCase().trim();

    const quickReply = await prisma.quickReply.findFirst({
      where: {
        isActive: true,
        triggers: {
          hasSome: [lowerMessage],
        },
      },
    });

    return quickReply;
  }

  async addQuickReply(userId: number, triggers: string[], buttons: string[]) {
    const prisma = await this.getPrisma(userId);
    return prisma.quickReply.create({
      data: {
        triggers: triggers.map((t) => t.toLowerCase()),
        buttons,
      },
    });
  }

  async updateQuickReply(
    id: number,
    userId: number,
    triggers: string[],
    buttons: string[],
    isActive: boolean,
  ) {
    const prisma = await this.getPrisma(userId);
    return prisma.quickReply.update({
      where: { id },
      data: {
        triggers: triggers.map((t) => t.toLowerCase()),
        buttons,
        isActive,
      },
    });
  }

  async removeQuickReply(id: number, userId: number): Promise<boolean> {
    const prisma = await this.getPrisma(userId);
    try {
      await prisma.quickReply.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }

  async getAllQuickReplies(userId: number) {
    const prisma = await this.getPrisma(userId);
    return prisma.quickReply.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
