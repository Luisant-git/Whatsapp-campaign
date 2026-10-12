import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { CampaignService } from './campaign.service';
import { isWithinAllowedSendingHours } from '../utils/campaign-window.util';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private campaignService: CampaignService
  ) {}

  // @Cron('0 * * * * *') // Disabled for multi-tenancy migration
  async handleScheduledCampaigns() {
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const currentTime = now.toLocaleTimeString('en-IN', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Asia/Kolkata'
    });

    this.logger.debug(`Checking scheduled campaigns for ${currentDay} at ${currentTime} IST`);

    if (!isWithinAllowedSendingHours(now)) {
      this.logger.debug(`SchedulerService: Outside allowed sending hours (8:00 AM - 8:00 PM IST). Scheduled campaigns paused for the night.`);
      return;
    }

    try {
      const scheduledCampaigns = await this.prisma.campaign.findMany({
        where: {
          status: 'scheduled',
          scheduleType: 'time-based',
          scheduledDays: {
            has: currentDay
          },
          scheduledTime: currentTime
        },
        include: {
          contacts: true
        }
      });

      for (const campaign of scheduledCampaigns) {
        this.logger.log(`Running scheduled campaign: ${campaign.name} (ID: ${campaign.id})`);
        
        try {
          await this.campaignService.runCampaign(campaign.id, 0); // Pass 0 as userId since it's not used in database-level multi-tenancy
          this.logger.log(`Successfully executed scheduled campaign: ${campaign.name}`);
        } catch (error) {
          this.logger.error(`Failed to execute scheduled campaign ${campaign.name}:`, error);
          
          // Update campaign status to failed
          await this.prisma.campaign.update({
            where: { id: campaign.id },
            data: { status: 'failed' }
          });
        }
      }
    } catch (error) {
      this.logger.error('Error checking scheduled campaigns:', error);
    }
  }

  async getScheduledCampaigns(userId: number) {
    return this.prisma.campaign.findMany({
      where: {
        status: 'scheduled',
        scheduleType: 'time-based'
      },
      include: {
        _count: {
          select: {
            contacts: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}