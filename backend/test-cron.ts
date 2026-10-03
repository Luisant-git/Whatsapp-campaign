import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { MetaLeadsAutomationCronService } from './src/meta-leads/meta-leads-automation-cron.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const cronService = app.get(MetaLeadsAutomationCronService);
  
  console.log("Running cron tick...");
  await cronService.handleMetaLeadsAutomation();
  console.log("Cron tick finished!");
  
  await app.close();
}
bootstrap();
