import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
const session = require('express-session');
const FileStore = require('session-file-store')(session);

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Configure session middleware
  app.use(
    session({
      store: new FileStore({
        path: join(__dirname, '..', 'sessions'),
        ttl: 365 * 24 * 60 * 60, // 1 year in seconds
        retries: 0, // Don't retry on file errors
        logFn: () => {}, // Disable error logging
      }),
      secret: process.env.SESSION_SECRET || 'your-session-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
        httpOnly: true,
        secure: false, // Set to true in production with HTTPS
      },
    }),
  );
  
  // Serve static files from uploads directory
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });
  
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  
  const config = new DocumentBuilder()
    .setTitle('WhatsApp Campaign API')
    .setDescription('API for WhatsApp Campaign Management with bulk messaging')
    .setVersion('1.0')
    .addTag('WhatsApp', 'WhatsApp messaging endpoints')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  
  await app.listen(process.env.PORT ?? 3010);
}
bootstrap();
