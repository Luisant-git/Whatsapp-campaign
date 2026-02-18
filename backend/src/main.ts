import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
const session = require('express-session');
const connectPgSimple = require('connect-pg-simple');
const PgSession = connectPgSimple(session);

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Enable CORS first
  app.enableCors({
    origin: isProduction
      ? ['https://your-production-domain.com']
      : ['http://localhost:5173', 'http://localhost:5174'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  
  // Configure session middleware
  app.use(
    session({
      store: new PgSession({
        conString: process.env.CENTRAL_DATABASE_URL,
        tableName: 'session',
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || 'your-session-secret',
      resave: false,
      saveUninitialized: false,
      rolling: true,
      name: 'admin.sid',
      proxy: isProduction,
      cookie: {
        maxAge: 365 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
      },
    }),
  );
  
  // Serve static files from uploads directory
  const uploadsPath = process.env.NODE_ENV === 'production' 
    ? join(__dirname, '..', 'uploads')
    : join(process.cwd(), 'uploads');
  
  app.useStaticAssets(uploadsPath, {
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
