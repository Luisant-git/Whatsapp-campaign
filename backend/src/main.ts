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

  // Trust proxy for production (nginx/apache)
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // Enable CORS first
  app.enableCors({
    origin: true
      ? ['https://whatsapp.luisant.cloud', 'https://whatsapp.admin.luisant.cloud']
      : true,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Cookie'],
    exposedHeaders: ['Set-Cookie'],
  });

  app.use(
    session({
      store: new PgSession({
        conString: process.env.CENTRAL_DATABASE_URL,
        tableName: 'session',
        createTableIfMissing: true,
      }),
      name: 'admin.sid',
      secret: process.env.SESSION_SECRET || 'your-session-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 365 * 24 * 60 * 60 * 1000,
      },
      proxy: true,
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
