import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
const session = require('express-session');
const FileStore = require('session-file-store')(session);

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Enable CORS first
  app.enableCors({
    origin: isProduction 
      ? ['https://whatsapp.luisant.cloud', 'https://whatsapp.admin.luisant.cloud']
      : true,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Cookie'],
    exposedHeaders: ['Set-Cookie'],
  });
  
  // Configure session middleware
  app.use(
    session({
      store: new FileStore({
        path: join(__dirname, '..', 'sessions'),
        ttl: 365 * 24 * 60 * 60,
        retries: 0,
        logFn: () => {},
      }),
      secret: process.env.SESSION_SECRET || 'your-session-secret',
      resave: false,
      saveUninitialized: false,
      name: 'admin.sid',
      proxy: isProduction,
      cookie: {
        maxAge: 365 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        domain: isProduction ? '.luisant.cloud' : undefined,
      },
    }),
  );
  
  // Serve static files from uploads directory
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });
  
  const config = new DocumentBuilder()
    .setTitle('WhatsApp Campaign API')
    .setDescription('API for WhatsApp Campaign Management with bulk messaging')
    .setVersion('1.0')
    .addTag('WhatsApp', 'WhatsApp messaging endpoints')
    .addTag('Admin', 'Admin authentication endpoints')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  
  await app.listen(process.env.PORT ?? 3010);
}
bootstrap();
