import { Module } from '@nestjs/common';
import { TenentnoteService } from './tenentnote.service';
import { TenentnoteController } from './tenentnote.controller';

@Module({
  controllers: [TenentnoteController],
  providers: [TenentnoteService],
})
export class TenentnoteModule {}
