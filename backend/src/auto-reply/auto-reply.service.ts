import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import { CentralPrismaService } from '../central-prisma.service';

@Injectable()
export class AutoReplyService {
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

  async getAutoReply(message: string, userId: number): Promise<string | null> {
    const prisma = await this.getPrisma(userId);
    const lowerMessage = message.toLowerCase().trim();

    const autoReplies = await prisma.autoReply.findMany({
      where: { isActive: true },
    });

    for (const autoReply of autoReplies) {
      const matchedTrigger = autoReply.triggers.find((trigger) =>
        lowerMessage.includes(trigger.toLowerCase()),
      );

      if (matchedTrigger) {
        return autoReply.response;
      }
    }

    return null;
  }

  async addAutoReply(userId: number, triggers: string[], response: string) {
    const prisma = await this.getPrisma(userId);
    return prisma.autoReply.create({
      data: {
        triggers,
        response,
      },
    });
  }

  async updateAutoReply(
    id: number,
    userId: number,
    triggers: string[],
    response: string,
    isActive: boolean,
  ) {
    const prisma = await this.getPrisma(userId);
    return prisma.autoReply.update({
      where: { id },
      data: { triggers, response, isActive },
    });
  }

  async removeAutoReply(id: number, userId: number): Promise<boolean> {
    const prisma = await this.getPrisma(userId);
    try {
      await prisma.autoReply.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }

  async getAllAutoReplies(userId: number) {
    const prisma = await this.getPrisma(userId);
    return prisma.autoReply.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
