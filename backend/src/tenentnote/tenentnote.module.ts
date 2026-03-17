import { Module } from '@nestjs/common';
import { TenentnoteService } from './tenentnote.service';
import { TenentnoteController } from './tenentnote.controller';
import { CentralPrismaService } from 'src/central-prisma.service';

@Module({
  controllers: [TenentnoteController],
  providers: [TenentnoteService, CentralPrismaService],
})
export class TenentnoteModule {}
